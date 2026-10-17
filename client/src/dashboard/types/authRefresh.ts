export enum AutoRefreshStatus {
  Idle = "idle",
  Success = "success",
  Fetching = "fetching",
  Delayed = "delayed",
  Error = "error",
  Paused = "paused",
}

export interface AutoRefreshState {
  autoRefreshStatus: AutoRefreshStatus;
  autoRefreshPaused: boolean;
  autoRefreshPausedByTab: boolean;
  lastSuccessfulRefresh: number | null;
  lastAutoRefreshTime: number | null;
  lastRefreshError: string | null;
  refreshErrorCount: number;
  autoRefreshFetchStartTime: number | null;
  autoRefreshPauseOnInactiveTab: boolean;
}

export const AUTO_REFRESH_STATE_DEFAULTS: AutoRefreshState = {
  autoRefreshStatus: AutoRefreshStatus.Idle,
  autoRefreshPaused: false,
  autoRefreshPausedByTab: false,
  lastSuccessfulRefresh: null,
  lastAutoRefreshTime: null,
  lastRefreshError: null,
  refreshErrorCount: 0,
  autoRefreshFetchStartTime: null,
  autoRefreshPauseOnInactiveTab: false,
};

export const ERROR_THRESHOLD_COUNT = 2;
