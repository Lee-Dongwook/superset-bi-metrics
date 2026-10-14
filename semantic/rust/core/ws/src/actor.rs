use std::collections::HashMap;
use std::io::Cursor;
use std::time::Duration;

use arrow::array::RecordBatch;
use arrow::datatypes::SchemaRef;
use arrow::ipc::reader::StreamReader;
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, oneshot};
use tokio::time::{Instant, interval, sleep, timeout};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::handshake::client::Request;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::http::header::{AUTHORIZATION, SERVER};
use tokio_tungstenite::tungstenite::{self, Message};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async};

use crate::client::ClientConfig;
use crate::codec::{self, Frame};
use crate::error::TransportError;
use crate::result::{QueryResult, ResultData};

pub type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;
type Reply = oneshot::Sender<Result<QueryResult, TransportError>>;

pub enum ActorRequest {
    Query { sql: String, reply: Reply },
    Close,
}

fn build_request(cfg: &ClientConfig, process_id: &str) -> Result<Request, TransportError> {
    let mut req = cfg.url.as_str().into_client_request()?;
    let headers = req.headers_mut();
    if let Some(user) = &cfg.username {
        let token = base64::engine::general_purpose::STANDARD
            .encode(format!("{user}:{}", cfg.password.as_deref().unwrap_or("")));
        let value = HeaderValue::from_str(&format!("Basic {token}"))
            .map_err(|e| TransportError::Auth(e.to_string()))?;
        headers.insert(AUTHORIZATION, value);
    }
    let pid = HeaderValue::from_str(process_id).map_err(|e| TransportError::Auth(e.to_string()))?;
    headers.insert("x-process-id", pid);
    Ok(req)
}

/// Connects with exponential backoff (100ms doubling, capped at 5s),
/// giving up after `max_connect_retries` retries.
pub async fn connect_ws(
    cfg: &ClientConfig,
    process_id: &str,
) -> Result<(WsStream, Option<String>), TransportError> {
    let mut attempt = 0u32;
    loop {
        let err = match timeout(
            cfg.connect_timeout,
            connect_async(build_request(cfg, process_id)?),
        )
        .await
        {
            Ok(Ok((ws, resp))) => {
                let version = resp
                    .headers()
                    .get(SERVER)
                    .and_then(|v| v.to_str().ok())
                    .map(str::to_owned);
                return Ok((ws, version));
            }
            Ok(Err(e)) => TransportError::Connect(e),
            Err(_) => TransportError::Io(std::io::ErrorKind::TimedOut.into()),
        };
        if attempt >= cfg.max_connect_retries {
            return Err(err);
        }
        log::warn!("ws connect attempt {} failed: {err}", attempt + 1);
        sleep(Duration::from_millis(100 << attempt.min(6)).min(Duration::from_secs(5))).await;
        attempt += 1;
    }
}

#[derive(Default)]
struct ArrowAcc {
    schema: Option<SchemaRef>,
    batches: Vec<RecordBatch>,
}

struct Pending {
    reply: Reply,
    arrow: ArrowAcc,
}

enum Event {
    Req(Option<ActorRequest>),
    Msg(Option<Result<Message, tungstenite::Error>>),
    Tick,
}

pub struct Actor {
    cfg: ClientConfig,
    connection_id: String,
    process_id: String,
    rx: mpsc::UnboundedReceiver<ActorRequest>,
    ws: Option<WsStream>,
    next_id: u32,
    pending: HashMap<u32, Pending>,
}

impl Actor {
    pub fn new(
        cfg: ClientConfig,
        connection_id: String,
        process_id: String,
        rx: mpsc::UnboundedReceiver<ActorRequest>,
        ws: WsStream,
    ) -> Self {
        Self {
            cfg,
            connection_id,
            process_id,
            rx,
            ws: Some(ws),
            next_id: 0,
            pending: HashMap::new(),
        }
    }

    pub async fn run(mut self) {
        let mut ping = interval(self.cfg.ping_interval);
        let mut last_seen = Instant::now();

        loop {
            let Some(ws) = self.ws.as_mut() else {
                // Disconnected: stay idle until the next request, then reconnect lazily.
                match self.rx.recv().await {
                    None | Some(ActorRequest::Close) => return,
                    Some(ActorRequest::Query { sql, reply }) => {
                        match connect_ws(&self.cfg, &self.process_id).await {
                            Ok((ws, _)) => {
                                self.ws = Some(ws);
                                last_seen = Instant::now();
                                self.send_query(sql, reply).await;
                            }
                            Err(e) => {
                                let _ = reply.send(Err(e));
                            }
                        }
                    }
                }
                continue;
            };

            let event = tokio::select! {
                r = self.rx.recv() => Event::Req(r),
                m = ws.next() => Event::Msg(m),
                _ = ping.tick() => Event::Tick,
            };

            match event {
                Event::Req(None | Some(ActorRequest::Close)) => {
                    if let Some(mut ws) = self.ws.take() {
                        let _ = ws.close(None).await;
                    }
                    self.fail_all(|| TransportError::Closed);
                    return;
                }
                Event::Req(Some(ActorRequest::Query { sql, reply })) => {
                    self.send_query(sql, reply).await;
                }
                Event::Msg(Some(Ok(msg))) => {
                    last_seen = Instant::now();
                    match msg {
                        Message::Binary(buf) => self.handle_frame(&buf),
                        Message::Close(_) => self.disconnect(),
                        _ => {}
                    }
                }
                Event::Msg(Some(Err(e))) => {
                    log::warn!("ws read error: {e}");
                    self.disconnect();
                }
                Event::Msg(None) => self.disconnect(),
                Event::Tick => {
                    if last_seen.elapsed() > self.cfg.no_heartbeat_timeout {
                        log::warn!("ws heartbeat timeout");
                        self.disconnect();
                    } else if ws.send(Message::Ping(Default::default())).await.is_err() {
                        self.disconnect();
                    }
                }
            }
        }
    }

    async fn send_query(&mut self, sql: String, reply: Reply) {
        let Some(ws) = self.ws.as_mut() else {
            let _ = reply.send(Err(TransportError::Disconnected));
            return;
        };
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        let buf = codec::encode_query(id, &self.connection_id, &sql, self.cfg.response_format);
        if let Err(e) = ws.send(Message::Binary(buf.into())).await {
            let _ = reply.send(Err(e.into()));
            self.disconnect();
            return;
        }
        self.pending.insert(
            id,
            Pending {
                reply,
                arrow: ArrowAcc::default(),
            },
        );
    }

    fn handle_frame(&mut self, buf: &[u8]) {
        let (id, frame) = match codec::decode(buf) {
            Ok(v) => v,
            Err(e) => {
                log::warn!("dropping undecodable frame: {e}");
                return;
            }
        };
        let Some(p) = self.pending.get_mut(&id) else {
            log::debug!("frame for unknown message_id {id}");
            return;
        };

        let done = match frame {
            Frame::ResultSet { columns, rows } => Ok(ResultData::Legacy { columns, rows }),
            Frame::Error(e) => Err(TransportError::Query(e)),
            Frame::ArrowChunk { data, is_last } => match read_arrow(&data, &mut p.arrow) {
                Err(e) => Err(e),
                Ok(()) if !is_last => return,
                Ok(()) => Ok(finish_arrow(&mut p.arrow)),
            },
            Frame::Completed if p.arrow.schema.is_some() => Ok(finish_arrow(&mut p.arrow)),
            Frame::Completed => Ok(ResultData::Completed),
        };

        let p = self.pending.remove(&id).unwrap();
        let _ = p.reply.send(done.map(|data| QueryResult { data }));
    }

    fn disconnect(&mut self) {
        self.ws = None;
        self.fail_all(|| TransportError::Disconnected);
    }

    fn fail_all(&mut self, err: fn() -> TransportError) {
        for (_, p) in self.pending.drain() {
            let _ = p.reply.send(Err(err()));
        }
    }
}

fn read_arrow(data: &[u8], acc: &mut ArrowAcc) -> Result<(), TransportError> {
    let proto = |e: arrow::error::ArrowError| TransportError::Protocol(e.to_string());
    let reader = StreamReader::try_new(Cursor::new(data), None).map_err(proto)?;
    acc.schema.get_or_insert_with(|| reader.schema());
    for batch in reader {
        acc.batches.push(batch.map_err(proto)?);
    }
    Ok(())
}

fn finish_arrow(acc: &mut ArrowAcc) -> ResultData {
    let acc = std::mem::take(acc);
    ResultData::Arrow {
        schema: acc
            .schema
            .unwrap_or_else(|| arrow::datatypes::Schema::empty().into()),
        batches: acc.batches,
    }
}
