const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "bundle"),
    library: {
      name: "bimetricsSdk",
      type: "umd",
    },
  },
  devtool: "source-map",
  moudle: {
    rules: [
      {
        test: /\.[tj]s$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};
