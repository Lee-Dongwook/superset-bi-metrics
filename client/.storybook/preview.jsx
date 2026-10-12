import { combineReducers, createStore, applyMiddleware, compose } from "redux";
import thunk from "redux-thunk";
import { Provider } from "react-redux";
import reducerIndex from "spec/helpers/reducerIndex";

if (typeof document != "undefined") {
  let appEl = document.getElementById("app");
  if (!appEl) {
    appEl = document.createElement("div");
    appEl.id = "app";
    document.body.appendChild(appEl);
  }

  appEl.setAttribute(
    "data-bootstrap",
    JSON.stringify({
      common: {
        conf: {
          HTML_SANITIZATION: false,
        },
      },
    }),
  );
}

const store = createStore(
  combineReducers(reducerIndex),
  {},
  compose(applyMiddleware(thunk)),
);

export const globalTypes = {
  theme: {
    name: "Theme",
    defaultValue: "BI",
    toolbar: {
      icon: "paintbrush",
      items: Object.keys({}),
    },
  },
};
