import webpack from 'webpack'
import webpackUMDExternal from 'webpack-umd-external'

module.exports = {
  entry: `${__dirname}/src/index.js`,
  output: {
    path: `${__dirname}/dist/src`,
    filename: 'index.browser.js',
    library: 'firedux',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  externals: [
    {
      firebase: 'firebase',
      updeep: 'updeep'
    },
    webpackUMDExternal({
      lodash: '_'
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  devtool: 'source-map',
  plugins: [
    new webpack.optimize.UglifyJsPlugin()
  ]
}
