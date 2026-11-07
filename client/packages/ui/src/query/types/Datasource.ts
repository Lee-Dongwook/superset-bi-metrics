export interface Currency {
  symbol: string;
  symbolPosition: string;
}

export enum DatasourceType {
  Table = "table",
  Query = "query",
  Dataset = "dataset",
  SlTable = "sl_table",
  SavedQuery = "saved_query",
  SemanticView = "semantic_view",
}
