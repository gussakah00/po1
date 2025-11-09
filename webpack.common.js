const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    app: "./src/scripts/index.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/public",
          to: "",
          globOptions: {
            ignore: ["**/generate-icons.js"],
          },
        },
        // Salin sw.js dari root
        {
          from: "sw.js",
          to: "sw.js",
        },
        // Salin app.webmanifest
        {
          from: "app.webmanifest",
          to: "app.webmanifest",
        },
        // Salin file lain di root jika ada
        {
          from: "*.json",
          to: "",
          globOptions: {
            ignore: ["**/package*.json", "**/tsconfig.json"],
          },
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
};
