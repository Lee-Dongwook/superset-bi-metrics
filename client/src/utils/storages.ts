import { TableTab } from "../constants";
import { DashboardContextForExplore } from "../types";

export enum LocalStorageKeys {
  Database = "db",
  ChartSplitSizes = "chart_split_sizes",
  ControlsWidth = "controls_width",
  DatasourceWidth = "datasource_width",
  IsDatapanelOpen = "is_datapanel_open",
  HomepageChartFilter = "homepage_chart_filter",
  HomepageDashboardFilter = "homepage_dashboard_filter",
  HomepageCollapseState = "homepage_collapse_state",
  HomepageActivityFilter = "homepage_activity_filter",
  DatasetnameSetSuccessful = "datasetname_set_successful",
  SqllabIsAutocompleteEnabled = "sqllab__is_autocomplete_enabled",
  SqllabIsRenderHtmlEnabled = "sqllab__is_render_html_enabled",
  SqllabPinnedSchemas = "sqllab__pinned_schemas",
  ExploreDataTableOriginalFormattedTimeColumns = "explore__data_table_original_formatted_time_columns",
  DashboardCustomFilterBarWidths = "dashboard__custom_filter_bar_widths",
  DashboardExploreContext = "dashboard__explore_context",
  DashboardEditorShowOnlyMyCharts = "dashboard__editor_show_only_my_charts",
  CommonResizableSidebarWidths = "common__resizable_sidebar_widths",
  ChatState = "chat__state",
  LastArchivedType = "archive__last_type",
}

export type LocalStorageValuesArchiveLastType =
  | "chart"
  | "dashboard"
  | "dataset"
  | null;

export interface LocalStorageValuesChatState {
  open: boolean;
  mode: string;
}

export type LocalStorageValues = {
  archive__last_type: LocalStorageValuesArchiveLastType;
  db: object | null;
  chart_split_sizes: [number, number];
  controls_width: number;
  datasource_width: number;
  is_datapanel_open: boolean;
  homepage_chart_filter: TableTab;
  homepage_dashboard_filter: TableTab;
  homepage_collapse_state: string[];
  datasetname_set_successful: boolean;
  homepage_activity_filter: TableTab | null;
  sqllab__is_autocomplete_enabled: boolean;
  sqllab__is_render_html_enabled: boolean;
  sqllab__pinned_schemas: Record<string, string[]>;
  explore__data_table_original_formatted_time_columns: Record<string, string[]>;
  dashboard__custom_filter_bar_widths: Record<string, number>;
  dashboard__explore_context: Record<string, DashboardContextForExplore>;
  dashboard__editor_show_only_my_charts: boolean;
  common__resizable_sidebar_widths: Record<string, number>;
  chat__state: LocalStorageValuesChatState;
};

export function dangerouslySetItemDoNotUse(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function setItem<K extends LocalStorageKeys>(
  key: K,
  value: LocalStorageValues[K],
): void {
  dangerouslySetItemDoNotUse(key, value);
}
