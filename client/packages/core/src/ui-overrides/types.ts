import type { ComponentType } from "react";

export type Extensions = Partial<{
  "welcome.banner": ComponentType;
  "welcome.main.replacement": ComponentType;
}>;
