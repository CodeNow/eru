import path from 'path'
import webpack from 'webpack'

// Serve the Relay app
const compiler = webpack({
  entry: path.resolve(__dirname, '../app', 'app.js'),
  module: {
    loaders: [
      {
        loader: 'babel',
        exclude: [/node_modules/, /test/],
        query: {
          plugins: [ path.resolve(__dirname, 'babel-relay-plugin') ]
        },
        test: /\.js$/
      }, {
        loader: 'ignore-loader',
        test: /test/
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false,
      minimize: true,
      mangle: true,
      compress: {
        dead_code: true,
        warnings: false
      }
    })
  ],
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, '../public/js')
  }
})

compiler.run((err, stats) => {
  if (err) { throw err }
  if (stats && stats.compilation) {
    if (stats.compilation.errors && stats.compilation.errors.length) {
      console.log(stats.compilation.errors[0].message)
      console.log(stats.compilation.errors[0].stack)
      process.exit(1)
    }
  }
})
