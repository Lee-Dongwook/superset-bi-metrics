import { Suspense, useEffect, useMemo } from "react";
import {
  BrowserRouter as Router,
  Route,
  useLocation,
  Routes,
  Navigate,
} from "react-router-dom";
import { createHtmlPortalNode } from "react-reverse-portal";

import getBootstrapData from "./utils/bootstrap";
import { css, useTheme } from "@bi-metrics/core";
import { routes } from "./routes";
import { RoutePaths } from "./constants";
import { Provider } from "react-redux";
import { store } from "./store";
import ThemeProvider from "./components/ThemeProvider";

const bootstrapData = getBootstrapData();
const locale =
  bootstrapData.common?.locale || window.navigator.language || "en";
document.documentElement.lang = String(locale).replaceAll("_", "-");
window.featureFlags = bootstrapData.common.feature_flags ?? {};

const layoutCss = css`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const contentCss = css`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  position: relative;
`;

const lockedShellCss = css`
  height: 100vh;
  overflow: hidden;
`;

export const pageScrollShellCss = css`
  flex: 1 1 auto;
  min-height: 0;
`;

const pageScrollContentCss = css`
  display: flex;
  flex-direction: column;
`;

const RouteSwitch = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={RoutePaths.HOME} replace />} />
      {routes.map(({ path, Component, props = {} }) => (
        <Route
          path={path}
          key={path}
          element={
            <Suspense fallback={<>Loading...</>}>
              <Component user={bootstrapData.user} {...props} />
            </Suspense>
          }
        />
      ))}
    </Routes>
  );
};

const App = () => {
  const layoutPortalNode = useMemo(
    () =>
      createHtmlPortalNode({
        attributes: {
          style:
            "display: flex; flex-direction: column; flex: 1 1 auto; height: 100%; min-height: 0;",
        },
      }),
    [],
  );

  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router basename="">
          <RouteSwitch />
        </Router>
      </ThemeProvider>
    </Provider>
  );
};
export default App;
