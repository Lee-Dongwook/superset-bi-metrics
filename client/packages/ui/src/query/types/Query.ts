export const ErrorTypeEnum = {
  FRONTEND_CSRF_ERROR: "FRONTEND_CSRF_ERROR",
  //TODO
};

type ValueOf<T> = T[keyof T];
export type ErrorType = ValueOf<typeof ErrorTypeEnum>;

export type ErrorLevel = "info" | "warning" | "error";
export type ErrorSource = "dashboard" | "explore" | "sqllab" | "crud";

export type BiMetricsError<ExtraType = Record<string, any> | null> = {
  error_type: ErrorType;
  extra: ExtraType;
  level: ErrorLevel;
  message: string;
};
