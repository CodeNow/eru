import fs from 'fs'
import path from 'path'
import webpack from 'webpack'

// Serve the Relay app
var compiler = webpack({
  entry: path.resolve(__dirname, '..', 'index-schedule.js'),
  output: { filename: 'schedule.bundle.js', path: path.resolve(__dirname, '..') },
  target: 'node',
  externals: getExternals(),
  node: {
    __filename: true,
    __dirname: true
  },
  module: {
    loaders: [
      {
        loader: 'babel',
        exclude: /node_modules/,
        test: /\.js$/
      }, {
        loader: 'ignore-loader',
        test: /test/
      }
    ]
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

function getExternals () {
  const opts = fs.readdirSync(path.resolve(__dirname, '../node_modules'))
    .reduce(function (ext, mod) {
      ext[mod] = 'commonjs ' + mod
      return ext
    }, {})
  return opts
}
