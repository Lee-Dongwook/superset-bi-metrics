use std::time::Duration;

use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

use crate::actor::{Actor, ActorRequest, connect_ws};
use crate::error::TransportError;
use crate::result::{QueryResult, ResponseFormat};

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub url: url::Url,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ping_interval: Duration,
    pub no_heartbeat_timeout: Duration,
    pub max_connect_retries: u32,
    pub connect_timeout: Duration,
    pub response_format: ResponseFormat,
}

impl ClientConfig {
    pub fn new(url: url::Url) -> Self {
        let (url, username, password) = extract_userinfo(url);

        Self {
            url,
            username,
            password,
            ping_interval: Duration::from_secs(5),
            no_heartbeat_timeout: Duration::from_secs(30),
            max_connect_retries: 20,
            connect_timeout: Duration::from_secs(10),
            response_format: ResponseFormat::default(),
        }
    }

    pub fn with_credentials(mut self, user: impl Into<String>, pass: impl Into<String>) -> Self {
        self.username = Some(user.into());
        self.password = Some(pass.into());
        self
    }
}

fn extract_userinfo(mut url: url::Url) -> (url::Url, Option<String>, Option<String>) {
    if url.username().is_empty() && url.password().is_none() {
        return (url, None, None);
    }

    let user = percent_decode(url.username());
    let pass = url.password().map(percent_decode);

    let _ = url.set_username("");
    let _ = url.set_password(None);

    (url, Some(user), pass)
}

fn percent_decode(s: &str) -> String {
    percent_encoding::percent_decode_str(s)
        .decode_utf8_lossy()
        .into_owned()
}

#[derive(Clone)]
pub struct Client {
    tx: mpsc::UnboundedSender<ActorRequest>,
    server_version: Option<String>,
}

impl Client {
    pub async fn connect(cfg: ClientConfig) -> Result<Self, TransportError> {
        let process_id = Uuid::new_v4().to_string();
        let (ws, version) = connect_ws(&cfg, &process_id).await?;
        let connection_id = Uuid::new_v4().to_string();
        let (tx, rx) = mpsc::unbounded_channel();
        let actor = Actor::new(cfg, connection_id, process_id, rx, ws);
        tokio::spawn(actor.run());
        Ok(Self {
            tx,
            server_version: version,
        })
    }

    pub fn server_version(&self) -> Option<&str> {
        self.server_version.as_deref()
    }

    pub async fn query(&self, sql: impl Into<String>) -> Result<QueryResult, TransportError> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.tx
            .send(ActorRequest::Query {
                sql: sql.into(),
                reply: reply_tx,
            })
            .map_err(|_| TransportError::Closed)?;
        reply_rx.await.map_err(|_| TransportError::Closed)?
    }

    pub fn close(&self) {
        let _ = self.tx.send(ActorRequest::Close);
    }
}
