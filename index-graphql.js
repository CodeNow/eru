import loadenv from 'loadenv'
loadenv()

import cacheLayer from './data/cache-layer'
import graphQLServer from './lib/graphql-server'

const { GRAPHQL_PORT } = process.env

cacheLayer.connect()
  .then(() => {
    graphQLServer.listen(GRAPHQL_PORT, () => {
      console.log(`App Server running on port ${GRAPHQL_PORT}`)
    })
  })
