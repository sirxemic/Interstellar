const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/main.js',

  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: 'build.js'
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'eslint-loader',
        enforce: 'pre'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.glsl$/,
        use: 'raw-loader'
      }
    ]
  },

  devtool: '#source-map',

  optimization: {
    minimize: true
  }
}
