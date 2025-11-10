const common = require("./webpack.common.js");
const { merge } = require("webpack-merge");
const webpack = require("webpack");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    static: "./dist",
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: {
      index: "/", // Untuk SPA routing di development
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("development"),
      "process.env.BASE_PATH": JSON.stringify("/"),
    }),
  ],
});
