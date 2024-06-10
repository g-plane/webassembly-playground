import path from "node:path"
import HtmlWebpackPlugin from "html-webpack-plugin"

/** @type {import("webpack").Configuration} */
export default {
  entry: {
    main: "./src/index.tsx",
    preview: "./src/preview/index.ts",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", "..."],
    fallback: {
      fs: false,
      path: false,
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html",
      chunks: ["main"],
    }),
    new HtmlWebpackPlugin({
      filename: "preview.html",
      title: "Preview",
      chunks: ["preview"],
    })
  ],
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(import.meta.dirname, "dist"),
    clean: true,
  },
  optimization: {
    moduleIds: "deterministic",
    runtimeChunk: "single",
    splitChunks: {
      cacheGroups: {
        wabt: {
          test: /[\\/]node_modules[\\/]wabt/,
          name: "wabt",
          chunks: "all",
        }
      }
    },
  },
}
