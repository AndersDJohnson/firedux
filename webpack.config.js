var webpackUMDExternal = require('webpack-umd-external')

module.exports = {
  entry: './src/index.js',
  output: {
    path: 'dist/src',
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
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel'
      }
    ]
  },
  devtool: 'source-map'
}
