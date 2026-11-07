import type { ComponentProps, ComponentType } from "react";
import { RoutePaths } from "./constants";
import Home from "./pages/Home";

type Routes = {
  path: string;
  Component: ComponentType;
  Fallback?: ComponentType;
  props?: ComponentProps<any>;
  mobileSupported?: boolean;
}[];

export const routes: Routes = [
  { path: RoutePaths.HOME, Component: Home, mobileSupported: true },
];
