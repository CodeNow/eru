import path from 'path'
import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'

import Runnable from '../data/runnable'
import graphQLServer from './graphql-server'
import workerServer from './worker-server'

const APP_PORT = 5501
const GRAPHQL_PORT = 5502

graphQLServer.listen(GRAPHQL_PORT, () => console.log(
  `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}`
))

Runnable.connect()
  .then(() => (workerServer.start()))

// Serve the Relay app
const compiler = webpack({
  entry: {
    app: [
      `webpack-dev-server/client?http://localhost:${APP_PORT}`,
      path.resolve(__dirname, '../app', 'app.js')
    ]
  },
  module: {
    loaders: [
      {
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          plugins: [
            path.resolve(__dirname, '../scripts/babel-relay-plugin')
          ]
        },
        test: /\.js$/
      }
    ]
  },
  output: {
    path: '/js/',
    filename: 'app.js'
  }
})

const app = new WebpackDevServer(compiler, {
  contentBase: path.resolve(__dirname, '../public'),
  proxy: {
    '/graphql': `http://localhost:${GRAPHQL_PORT}`
  },
  publicPath: '/js/',
  stats: { colors: true },
  noInfo: true,
  historyApiFallback: {
    index: 'index.html',
    rewrites: [
      { from: /\/app.*/, to: '/app/index.html' }
    ]
  }
})

app.listen(APP_PORT, () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`)
})
