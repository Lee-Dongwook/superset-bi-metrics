import { type ReactNode } from "react";

export interface SelectOption {
  label: ReactNode;
  value: any;
  title?: string;
  [key: string]: unknown;
}
