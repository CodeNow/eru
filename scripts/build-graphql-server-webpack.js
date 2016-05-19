import fs from 'fs'
import path from 'path'
import webpack from 'webpack'

// Serve the Relay app
var compiler = webpack({
  entry: path.resolve(__dirname, '..', 'index-graphql.js'),
  output: { filename: 'graphql-server.bundle.js', path: path.resolve(__dirname, '..') },
  target: 'node',
  externals: fs.readdirSync(path.resolve(__dirname, '../node_modules'))
    .reduce(function (ext, mod) {
      ext[mod] = 'commonjs ' + mod
      return ext
    }, {}),
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
