export type GuestTokenFetchFn = () => Promise<string>;

export type UiConfigType = {
  hideTitle?: boolean;
  hideTab?: boolean;
  hideChartControls?: boolean;
  emitDataMasks?: boolean;
  filters?: {
    [key: string]: boolean | undefined;
    visible?: boolean;
    expanded?: boolean;
  };
  urlParams?: {
    [key: string]: any;
  };
  showRowLimitWarning?: boolean;
};

const DEFAULT_GUEST_TOKEN_FETCH_TIMEOUT_MS = 30_000;
const HANDSHAKE_PROBE_METHOD = "bimetricsSdkHandshake";
const HANDSHAKE_PROBE_TIMEOUT_MS = 5_000;
