import { useTheme, Global } from "@emotion/react";
import { GlobalStyleSheet } from "./GlobalStyleSheet";

export const GlobalStyles = ({ isDark }: { isDark: boolean }) => (
  <Global styles={GlobalStyleSheet({ isDark, theme: useTheme() })} />
);
