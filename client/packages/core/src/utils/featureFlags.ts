import { logging as logger } from ".";

declare global {
  interface Window {
    featureFlags: FeatureFlagMap;
  }
}

export enum FeatureFlag {
  AlertsAttachReports = "ALERTS_ATTACH_REPORTS",
  AlertReports = "ALERT_REPORTS",
  AlertReportDynamicExecutor = "ALERT_REPORT_DYNAMIC_EXECUTOR",
  AlertReportTabs = "ALERT_REPORT_TABS",
  AlertReportSlackV2 = "ALERT_REPORT_SLACK_V2",
  AlertReportWebhook = "ALERT_REPORT_WEBHOOK",
  AlertReportsFilter = "ALERT_REPORTS_FILTER",
  AlertReportsRetry = "ALERT_REPORTS_RETRY",
  AllowFullCsvExport = "ALLOW_FULL_CSV_EXPORT",
  ChartPluginsExperimental = "CHART_PLUGINS_EXPERIMENTAL",
  ConfirmDashboardDiff = "CONFIRM_DASHBOARD_DIFF",
  CssTemplates = "CSS_TEMPLATES",
  DashboardVirtualization = "DASHBOARD_VIRTUALIZATION",
  DashboardVirtualizationDeferData = "DASHBOARD_VIRTUALIZATION_DEFER_DATA",
  DatapanelClosedByDefault = "DATAPANEL_CLOSED_BY_DEFAULT",
  DatasetFolders = "DATASET_FOLDERS",
  DateRangeTimeshiftsEnabled = "DATE_RANGE_TIMESHIFTS_ENABLED",
  DisableEmbeddedSupersetLogout = "DISABLE_EMBEDDED_SUPERSET_LOGOUT",
  ScheduledQueries = "SCHEDULED_QUERIES",
  MobileConsumptionMode = "MOBILE_CONSUMPTION_MODE",
  Thumbnails = "THUMBNAILS",
}

export type ScheduleQueriesProps = {
  JSONSCHEMA: {
    [key: string]: string;
  };
  UISCHEMA: {
    [key: string]: string;
  };
  VALIDATION: {
    [key: string]: string;
  };
};

export type FeatureFlagMap = {
  [key in Exclude<FeatureFlag, FeatureFlag.ScheduledQueries>]?: boolean;
} & {
  ScheduledQueries?: ScheduleQueriesProps;
};

export function isFeatureEnabled(feature: FeatureFlag): boolean {
  try {
    return !!window.featureFlags[feature as keyof FeatureFlagMap];
  } catch (error) {
    logger.error(`Failed to query feature flag ${feature}`);
  }

  return false;
}
