import rison from "rison";
import { BiMetricsClient, logging } from "@bi-metrics/core";
import { t } from "@bi-metrics/core/translation";
import { TableTab } from "../constants";
import type {
  Chart,
  Dashboard,
  FetchDataConfig,
  Filter,
  FilterValue,
  User,
} from "../types";
import { WelcomeTable, type RecentActivity } from "../features/home/types";

export const PAGE_SIZE = 5;

const RECENT_ACTIVITY_LIMIT = 6;

const DEFAULT_SORT = [{ id: "changed_on_delta_humanized", desc: true }];

const getParams = (filters?: Filter[], selectColumns?: string[]) =>
  rison.encode({
    order_column: "changed_on_delta_humanized",
    order_direction: "desc",
    page: 0,
    page_size: PAGE_SIZE,
    ...(filters ? { filters } : {}),
    ...(selectColumns ? { select_columns: selectColumns } : {}),
  });

type ErrorMessage = string | Record<string, string[] | string>;

async function getErrorMessage(e: unknown): Promise<ErrorMessage> {
  if (typeof e === "string") return e;
  if (e instanceof Response) {
    try {
      const body = await e.clone().json();
      return body.message || body.error || e.statusText;
    } catch {
      return e.statusText || t("An error occurred");
    }
  }
  const obj = e as { error?: string; message?: string } | undefined;
  return obj?.message || obj?.error || t("An error occurred");
}

export function createErrorHandler(
  handleErrorFunc: (errMsg?: ErrorMessage) => void,
) {
  return async (e: unknown) => {
    logging.error(e);
    handleErrorFunc(await getErrorMessage(e));
  };
}

export const getEditedObjects = (userId: string | number) => {
  const filters = [{ col: "changed_by", opr: "rel_o_m", value: `${userId}` }];
  return Promise.all([
    BiMetricsClient.get({
      endpoint: `/api/v1/dashboard/?q=${getParams(filters)}`,
    }),
    BiMetricsClient.get({ endpoint: `/api/v1/chart/?q=${getParams(filters)}` }),
  ])
    .then(([editedDashboards, editedCharts]) => ({
      editedDash: editedDashboards.json?.result.slice(0, 3),
      editedChart: editedCharts.json?.result.slice(0, 3),
    }))
    .catch((err) => err);
};

export const getUserEditableObjects = (
  _userId: string | number,
  resource: string,
  filters: Filter[] = [{ col: "id", opr: "is_editable", value: 1 }],
  selectColumns?: string[],
) =>
  BiMetricsClient.get({
    endpoint: `/api/v1/${resource}/?q=${getParams(filters, selectColumns)}`,
  }).then((res) => res.json?.result);

export const getFilteredChartsandDashboards = (
  addDangerToast: (msg: string) => void,
  filters: Filter[],
) =>
  Promise.all([
    BiMetricsClient.get({ endpoint: `/api/v1/chart/?q=${getParams(filters)}` }),
    BiMetricsClient.get({
      endpoint: `/api/v1/dashboard/?q=${getParams(filters)}`,
    }),
  ])
    .then(([chartRes, dashboardRes]) => ({
      other: [...chartRes.json.result, ...dashboardRes.json.result],
    }))
    .catch(() => {
      addDangerToast(
        t("There was an error fetching the filtered charts and dashboards:"),
      );
      return { other: [] };
    });

export const getRecentActivityObjs = (
  recent: string,
  addDangerToast: (msg: string) => void,
  filters: Filter[],
) =>
  BiMetricsClient.get({ endpoint: recent }).then((recentsRes) => {
    // keep the most recent entry per url, newest first
    const distinct = new Map<string, RecentActivity>();
    for (const record of recentsRes.json.result as RecentActivity[]) {
      if (!distinct.has(record.item_url)) distinct.set(record.item_url, record);
      if (distinct.size === RECENT_ACTIVITY_LIMIT) break;
    }
    return getFilteredChartsandDashboards(addDangerToast, filters).then(
      ({ other }) => ({ other, viewed: [...distinct.values()] }),
    );
  });

export function getFilterValues(
  tab: TableTab,
  welcomeTable: WelcomeTable,
  user?: User,
  otherTabFilters?: Filter[],
): FilterValue[] {
  if (
    tab === TableTab.Created ||
    (welcomeTable === WelcomeTable.SavedQueries && tab === TableTab.Mine)
  ) {
    return [
      { id: "created_by", operator: "rel_o_m", value: `${user?.userId}` },
    ];
  }
  if (welcomeTable === WelcomeTable.SavedQueries && tab === TableTab.Favorite) {
    return [{ id: "id", operator: "saved_query_is_fav", value: true }];
  }
  if (tab === TableTab.Mine && user) {
    return [{ id: "id", operator: "is_editable", value: true }];
  }
  if (
    tab === TableTab.Favorite &&
    (welcomeTable === WelcomeTable.Dashboards ||
      welcomeTable === WelcomeTable.Charts)
  ) {
    return [
      {
        id: "id",
        operator:
          welcomeTable === WelcomeTable.Dashboards
            ? "dashboard_is_favorite"
            : "chart_is_favorite",
        value: true,
      },
    ];
  }
  if (tab === TableTab.Other) {
    return (otherTabFilters || []).map((flt) => ({
      id: flt.col,
      operator: flt.opr,
      value: flt.value,
    }));
  }
  return [];
}

type RefreshData = (config?: FetchDataConfig | null) => void;

export function handleChartDelete(
  { id, slice_name: sliceName }: Chart,
  addSuccessToast: (msg: string) => void,
  addDangerToast: (msg: string) => void,
  refreshData: RefreshData,
  chartFilter?: string,
  userId?: string | number,
  getData?: (tab: TableTab) => void,
) {
  return BiMetricsClient.delete({ endpoint: `/api/v1/chart/${id}` }).then(
    () => {
      if (chartFilter === TableTab.Mine) {
        refreshData({
          pageIndex: 0,
          pageSize: PAGE_SIZE,
          sortBy: DEFAULT_SORT,
          filters: [
            { id: "created_by", operator: "rel_o_m", value: `${userId}` },
          ],
        });
      } else if (chartFilter && getData) getData(chartFilter as TableTab);
      else refreshData();
      addSuccessToast(t("Deleted: %s", sliceName));
    },
    createErrorHandler((errMsg) =>
      addDangerToast(
        t("There was an issue deleting %s: %s", sliceName, errMsg),
      ),
    ),
  );
}

export function handleDashboardDelete(
  { id, dashboard_title: dashboardTitle }: Dashboard,
  refreshData: RefreshData,
  addSuccessToast: (msg: string) => void,
  addDangerToast: (msg: string) => void,
  dashboardFilter?: string,
  getData?: (tab: TableTab) => void,
) {
  return BiMetricsClient.delete({ endpoint: `/api/v1/dashboard/${id}` }).then(
    () => {
      if (dashboardFilter === TableTab.Mine) {
        refreshData({
          pageIndex: 0,
          pageSize: PAGE_SIZE,
          sortBy: DEFAULT_SORT,
          filters: [{ id: "id", operator: "is_editable", value: true }],
        });
      } else if (dashboardFilter === TableTab.Other && getData) {
        getData(TableTab.Other);
      } else refreshData();
      addSuccessToast(t("Deleted: %s", dashboardTitle));
    },
    createErrorHandler((errMsg) =>
      addDangerToast(
        t("There was an issue deleting %s: %s", dashboardTitle, errMsg),
      ),
    ),
  );
}

export function shortenSQL(sql: string, maxLines: number) {
  const lines = sql.split("\n");
  return lines.length >= maxLines
    ? [...lines.slice(0, maxLines), "..."].join("\n")
    : sql;
}

/** True when the click landed on a real link, which handles navigation itself. */
export const isNavigationHandledByLink = (event: {
  target: EventTarget | null;
}): boolean =>
  Boolean((event.target as HTMLElement | null)?.closest?.("a[href]"));

export async function handleResourceExport(
  resource: string,
  ids: number[],
  done: () => void,
): Promise<void> {
  try {
    const response = await BiMetricsClient.get({
      endpoint: `/api/v1/${resource}/export/?q=${rison.encode(ids)}`,
      headers: {
        Accept: "application/zip, application/x-zip-compressed, text/plain",
      },
      parseMethod: "raw",
    });
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fileName =
      /filename="?([^";]+)"?/.exec(disposition)?.[1] ??
      `${resource}_export.zip`;

    const url = URL.createObjectURL(await response.blob());
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    done();
  }
}
