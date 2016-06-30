import path from 'path'
import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'

import cacheLayer from '../data/cache-layer'
import Runnable from '../data/runnable'
import graphQLServer from './graphql-server'
import workerServer from './worker-server'
import logger from './logger'

const APP_PORT = 5501
const GRAPHQL_PORT = 5502
const log = logger.child({ module: 'lib/dev-server' })

log.info('connecting to cache layer')
cacheLayer.connect()
  .then(() => {
    log.info('starting graphql server')
    graphQLServer.listen(GRAPHQL_PORT, () => {
      log.info(
        `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}`
      )
    })
  })

log.info('connecting to mongodb')
Runnable.connect()
  .then(() => {
    log.info('starting worker server')
    return workerServer.start()
  })

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

log.info('starting app server')
app.listen(APP_PORT, () => {
  log.info(`app server is now running on http://localhost:${APP_PORT}`)
})
