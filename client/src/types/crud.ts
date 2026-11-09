export type FavoriteStatus = { [id: number]: boolean };

export type Filter = {
  col: string;
  opr: string;
  value: string | number;
};

/** Filter shape used by list fetches (`col`/`opr` are named `id`/`operator`). */
export interface FilterValue {
  id: string;
  operator?: string;
  value: string | boolean | number | null | undefined | string[] | number[];
}

export interface FetchDataConfig {
  pageIndex: number;
  pageSize: number;
  sortBy: { id: string; desc?: boolean }[];
  filters: FilterValue[];
}

interface Editor {
  id: number;
}

export interface Chart {
  id: number;
  url: string;
  viz_type: string;
  slice_name: string;
  description?: string | null;
  cache_timeout?: number | null;
  thumbnail_url?: string;
  changed_on_delta_humanized?: string;
  changed_on_utc?: string;
  certified_by?: string;
  certification_details?: string;
  datasource_name_text?: string;
  editors?: Editor[];
  extra_editors?: number[];
}

export interface Dashboard {
  id: number;
  url: string;
  dashboard_title: string;
  published: boolean;
  changed_by_name: string;
  changed_by: string;
  changed_on?: string;
  changed_on_delta_humanized?: string;
  changed_on_utc?: string;
  certified_by?: string;
  certification_details?: string;
  thumbnail_url?: string | null;
  editors?: Editor[];
  extra_editors?: number[];
  loading?: boolean;
}

export interface SavedQueryObject {
  id: number;
  label: string;
  sql: string | null;
  changed_on: string;
  changed_on_delta_humanized: string;
  description?: string;
}
