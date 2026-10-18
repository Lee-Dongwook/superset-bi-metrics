import type { Preview } from "@storybook/react-vite";
import { Provider } from "react-redux";
import { legacy_createStore } from "redux";
import "@bi-metrics/ui/style.css";

// Echart reads locale / refresh state via useSelector
const store = legacy_createStore(() => ({
  common: { locale: "en" },
  dashboardState: { isRefreshing: false },
}));

const preview: Preview = {
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
};

export default preview;
