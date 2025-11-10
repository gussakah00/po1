const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Cek environment
const isProduction = process.env.NODE_ENV === "production";
const publicPath = isProduction ? "/po1/" : "/";

module.exports = {
  entry: "./src/scripts/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.bundle.js",
    clean: true,
    publicPath: publicPath,
  },
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./src/public",
          to: ".",
          noErrorOnMissing: true,
        },
        {
          from: "./src/styles/styles.css",
          to: "styles.css",
        },
        {
          from: "./app.webmanifest",
          to: ".",
        },
        {
          from: "./sw.js",
          to: ".",
        },
      ],
    }),
  ],
};
