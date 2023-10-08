const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    index: './src/dsl-resolver.ts'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.wasm'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  "useBuiltIns": "usage",
                  "corejs": "3"
                }
              ],
              "@babel/preset-typescript"
            ],
            "plugins": [
              "@babel/plugin-transform-runtime"
            ]
          }
        },
        exclude: /node_modules/, //排除 node_modules 目录
      }
    ],
  },
  plugins: [
    new CleanWebpackPlugin()
  ],
  performance: {
    maxAssetSize: 20000000,
	  maxEntrypointSize: 400000
  }
};
