use futures_util::{SinkExt, StreamExt};
use shared::codegen::*;
use shared::flatbuffers::FlatBufferBuilder;
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message;
use ws::{Client, ClientConfig, ResultData, TransportError};

fn reply(id: u32, sql: &str) -> Vec<u8> {
    let mut fbb = FlatBufferBuilder::new();
    let (command_type, command) = if sql == "FAIL" {
        let error = fbb.create_string("boom");
        let e = HttpError::create(&mut fbb, &HttpErrorArgs { error: Some(error) });
        (HttpCommand::HttpError, e.as_union_value())
    } else {
        let v = fbb.create_string(sql);
        let cell = HttpColumnValue::create(
            &mut fbb,
            &HttpColumnValueArgs {
                string_value: Some(v),
            },
        );
        let values = fbb.create_vector(&[cell]);
        let row = HttpRow::create(
            &mut fbb,
            &HttpRowArgs {
                values: Some(values),
            },
        );
        let rows = fbb.create_vector(&[row]);
        let col = fbb.create_string("q");
        let columns = fbb.create_vector(&[col]);
        let rs = HttpResultSet::create(
            &mut fbb,
            &HttpResultSetArgs {
                columns: Some(columns),
                rows: Some(rows),
            },
        );
        (HttpCommand::HttpResultSet, rs.as_union_value())
    };
    let msg = HttpMessage::create(
        &mut fbb,
        &HttpMessageArgs {
            message_id: id,
            command_type,
            command: Some(command),
            connection_id: None,
        },
    );
    fbb.finish(msg, None);
    fbb.finished_data().to_vec()
}

#[tokio::test]
async fn query_result_and_error() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        let (tcp, _) = listener.accept().await.unwrap();
        let mut ws = tokio_tungstenite::accept_async(tcp).await.unwrap();
        while let Some(Ok(msg)) = ws.next().await {
            if let Message::Binary(buf) = msg {
                let m = root_as_http_message(&buf).unwrap();
                let sql = m
                    .command_as_http_query()
                    .unwrap()
                    .query()
                    .unwrap()
                    .to_owned();
                ws.send(Message::Binary(reply(m.message_id(), &sql).into()))
                    .await
                    .unwrap();
            }
        }
    });

    let url = format!("ws://user:pa%20ss@{addr}/ws").parse().unwrap();
    let cfg = ClientConfig::new(url);
    assert_eq!(cfg.password.as_deref(), Some("pa ss"));
    let client = Client::connect(cfg).await.unwrap();

    let res = client.query("SELECT 1").await.unwrap();
    assert_eq!(res.get_columns(), vec!["q"]);
    match res.data {
        ResultData::Legacy { rows, .. } => assert_eq!(rows, vec![vec![Some("SELECT 1".into())]]),
        other => panic!("unexpected {other:?}"),
    }

    match client.query("FAIL").await {
        Err(TransportError::Query(e)) => assert_eq!(e, "boom"),
        other => panic!("unexpected {other:?}"),
    }

    client.close();
    assert!(matches!(
        client.query("x").await,
        Err(TransportError::Closed)
    ));
}
