const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

// Serve the Relay app
var compiler = webpack({
  entry: path.resolve(__dirname, '..', 'index-workers.js'),
  output: { filename: 'worker-server.bundle.js', path: path.resolve(__dirname, '..') },
  target: 'node',
  externals: [
    getExternals(),
    (ctx, req, cb) => {
      if (/^error-cat\/errors\/.+$/.test(req)) {
        return cb(null, `commonjs ${req}`)
      } else if ('ponos/lib/rabbitmq' === req) {
        return cb(null, `commonjs ${req}`)
      }
      return cb()
    }
  ],
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
    .concat('@runnable/orion')
    .reduce(function (ext, mod) {
      ext[mod] = 'commonjs ' + mod
      return ext
    }, {})
  return opts
}
