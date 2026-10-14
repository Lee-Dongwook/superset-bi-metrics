import path from "node:path";
import { fileURLToPath } from "node:url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import getProxyConfig from "./webpack.proxy-config.js";

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));

export default (_env, { mode = "production" }) => ({
  mode,
  entry: {
    main: path.join(APP_DIR, "src/index.tsx"),
    // Emitted at the output root so the worker's scope covers the whole app.
    "service-worker": path.join(APP_DIR, "src/service-worker.ts"),
  },
  output: {
    path: path.join(APP_DIR, "dist"),
    filename: "[name].js",
    publicPath: "/",
    clean: true,
  },
  devtool: mode === "development" ? "eval-cheap-module-source-map" : "source-map",
  cache: { type: "filesystem" },
  stats: "minimal",
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "BI Metrics",
      chunks: ["main"],
    }),
  ],
  devServer: {
    port: 5173,
    historyApiFallback: true,
    proxy: [getProxyConfig()],
  },
});
