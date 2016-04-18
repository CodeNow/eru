import loadenv from 'loadenv'
loadenv()

import graphQLServer from './lib/graphql-server'

const { GRAPHQL_PORT } = process.env

graphQLServer.listen(GRAPHQL_PORT, () => {
  console.log(`App Server running on port ${GRAPHQL_PORT}`)
})
