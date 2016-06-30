import loadenv from 'loadenv'
loadenv()

import cacheLayer from './data/cache-layer'
import graphQLServer from './lib/graphql-server'
import logger from './lib/logger'

const { GRAPHQL_PORT } = process.env
const log = logger.child({ module: 'index-graphql' })

log.info('connecting to cache')
cacheLayer.connect()
  .then(() => {
    log.info('starting graphql server')
    graphQLServer.listen(GRAPHQL_PORT, () => {
      log.info(`graphql server running on port ${GRAPHQL_PORT}`)
    })
  })
