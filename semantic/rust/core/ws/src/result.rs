use arrow::array::RecordBatch;
use arrow::datatypes::SchemaRef;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ResponseFormat {
    #[default]
    Legacy,
    Arrow,
    Completed,
}

impl std::fmt::Display for ResponseFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResponseFormat::Legacy => f.write_str("Legacy"),
            ResponseFormat::Arrow => f.write_str("Arrow"),
            ResponseFormat::Completed => f.write_str("Completed"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum ResultData {
    Legacy {
        columns: Vec<String>,
        rows: Vec<Vec<Option<String>>>,
    },
    Arrow {
        schema: SchemaRef,
        batches: Vec<RecordBatch>,
    },
    Completed,
}

#[derive(Debug, Clone)]
pub struct QueryResult {
    pub data: ResultData,
}

impl QueryResult {
    pub fn is_empty(&self) -> bool {
        self.row_count() == 0
    }

    pub fn row_count(&self) -> usize {
        match &self.data {
            ResultData::Legacy { rows, .. } => rows.len(),
            ResultData::Arrow { batches, .. } => batches.iter().map(|b| b.num_rows()).sum(),
            ResultData::Completed => 0,
        }
    }

    pub fn get_format(&self) -> ResponseFormat {
        match &self.data {
            ResultData::Legacy { .. } => ResponseFormat::Legacy,
            ResultData::Arrow { .. } => ResponseFormat::Arrow,
            ResultData::Completed => ResponseFormat::Completed,
        }
    }

    pub fn get_columns(&self) -> Vec<String> {
        match &self.data {
            ResultData::Legacy { columns, .. } => columns.clone(),
            ResultData::Arrow { schema, .. } => {
                schema.fields().iter().map(|f| f.name().clone()).collect()
            }
            ResultData::Completed => Vec::new(),
        }
    }
}
