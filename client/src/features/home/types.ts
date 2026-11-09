import type { Filter } from "../../types";

export enum WelcomeTable {
  Charts = "CHARTS",
  Dashboards = "DASHBOARDS",
  Recents = "RECENTS",
  SavedQueries = "SAVED_QUERIES",
}

export type WelcomePageLastTab = "examples" | "all" | [string, Filter[]];

/** Item returned by /api/v1/log/recent_activity/ */
export interface RecentActivity {
  action: string;
  item_type: "slice" | "dashboard";
  item_url: string;
  item_title: string;
  time: number;
  time_delta_humanized?: string;
}
