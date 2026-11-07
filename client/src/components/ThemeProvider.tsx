import type { ReactNode } from "react";
import { themeObject } from "@bi-metrics/core/theme";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return <themeObject.ThemeProvider>{children}</themeObject.ThemeProvider>;
}
