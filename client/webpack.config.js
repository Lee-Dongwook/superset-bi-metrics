import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import * as webpackBundleAnalyzer from "webpack-bundle-analyzer";
import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import MinimizerPlugin from "minimizer-webpack-plugin";
import * as LightningCSS from "lightningcss";
import SpeedMeasurePlugin from "speed-measure-webpack-plugin";
import {
  WebpackManifestPlugin,
  getCompilerHooks,
} from "webpack-manifest-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Visualizer from "webpack-visualizer-plugin2";
import getProxyConfig from "./webpack.proxy-config.js";

const { ModuleFederationPlugin } = webpack.container;
const { BundleAnalyzerPlugin } = webpackBundleAnalyzer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolveEsmModule = (specifier) =>
  fileURLToPath(import.meta.resolve(specifier));

const packageConfig = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

const parsedArgs = yargs(hideBin(process.argv)).parse();
const APP_DIR = path.resolve(__dirname, "./");

const config = {
  entry: {
    "service-worker": path.join(APP_DIR, "src/service-worker.ts"),
  },
  cache: {
    type: "filesystem",
  },
  stats: "minimal",
  ignoreWarnings: [],
};

return config;
