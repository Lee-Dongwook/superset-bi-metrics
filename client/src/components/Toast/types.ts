export enum ToastType {
  Info = "INFO_TOAST",
  Success = "SUCCESS_TOAST",
  Warning = "WARNING_TOAST",
  Danger = "DANGER_TOAST",
}

export interface ToastMetaAction {
  label: string;
  onClick: () => void;
}

export interface ToastMeta {
  id: string;
  toastType: ToastType;
  text: string;
  duration: number;
  action?: ToastMetaAction;
  noDuplicate?: boolean;
  allowHtml?: boolean;
}
