use shared::codegen::{
    root_as_http_message, HttpCommand, HttpMessage, HttpMessageArgs, HttpQuery, HttpQueryArgs,
    HttpQueryResultData, QueryResultFormat,
};
use shared::flatbuffers::FlatBufferBuilder;

use crate::error::TransportError;
use crate::result::ResponseFormat;

/// A decoded server frame, keyed by the `message_id` of the query it answers.
#[derive(Debug)]
pub enum Frame {
    ResultSet {
        columns: Vec<String>,
        rows: Vec<Vec<Option<String>>>,
    },
    Error(String),
    ArrowChunk {
        data: Vec<u8>,
        is_last: bool,
    },
    Completed,
}

pub fn encode_query(
    message_id: u32,
    connection_id: &str,
    sql: &str,
    format: ResponseFormat,
) -> Vec<u8> {
    let mut fbb = FlatBufferBuilder::new();
    let query = fbb.create_string(sql);
    let response_format = match format {
        ResponseFormat::Arrow => QueryResultFormat::Arrow,
        _ => QueryResultFormat::Legacy,
    };
    let command = HttpQuery::create(
        &mut fbb,
        &HttpQueryArgs {
            query: Some(query),
            response_format,
            ..Default::default()
        },
    );
    let connection_id = fbb.create_string(connection_id);
    let msg = HttpMessage::create(
        &mut fbb,
        &HttpMessageArgs {
            message_id,
            command_type: HttpCommand::HttpQuery,
            command: Some(command.as_union_value()),
            connection_id: Some(connection_id),
        },
    );
    fbb.finish(msg, None);
    fbb.finished_data().to_vec()
}

pub fn decode(buf: &[u8]) -> Result<(u32, Frame), TransportError> {
    let msg = root_as_http_message(buf).map_err(|e| TransportError::Protocol(e.to_string()))?;
    let id = msg.message_id();

    if let Some(rs) = msg.command_as_http_result_set() {
        let columns = rs
            .columns()
            .map(|c| c.iter().map(str::to_owned).collect())
            .unwrap_or_default();
        let rows = rs
            .rows()
            .map(|rows| {
                rows.iter()
                    .map(|row| {
                        row.values()
                            .map(|v| v.iter().map(|v| v.string_value().map(str::to_owned)).collect())
                            .unwrap_or_default()
                    })
                    .collect()
            })
            .unwrap_or_default();
        return Ok((id, Frame::ResultSet { columns, rows }));
    }
    if let Some(err) = msg.command_as_http_error() {
        return Ok((id, Frame::Error(err.error().unwrap_or("unknown error").to_owned())));
    }
    if let Some(res) = msg.command_as_http_query_result() {
        return match res.data_type() {
            HttpQueryResultData::HttpQueryResultArrow => {
                let a = res.data_as_http_query_result_arrow().unwrap();
                Ok((
                    id,
                    Frame::ArrowChunk {
                        data: a.data().bytes().to_vec(),
                        is_last: a.is_last(),
                    },
                ))
            }
            HttpQueryResultData::HttpQueryResultCompleted => Ok((id, Frame::Completed)),
            other => Err(TransportError::Protocol(format!("unknown result data {other:?}"))),
        };
    }
    Err(TransportError::Protocol(format!(
        "unexpected command {:?}",
        msg.command_type()
    )))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn query_roundtrip() {
        let buf = encode_query(7, "conn-1", "SELECT 1", ResponseFormat::Arrow);
        let msg = root_as_http_message(&buf).unwrap();
        assert_eq!(msg.message_id(), 7);
        assert_eq!(msg.connection_id(), Some("conn-1"));
        let q = msg.command_as_http_query().unwrap();
        assert_eq!(q.query(), Some("SELECT 1"));
        assert_eq!(q.response_format(), QueryResultFormat::Arrow);
        // A query is not a server frame.
        assert!(matches!(decode(&buf), Err(TransportError::Protocol(_))));
    }
}
