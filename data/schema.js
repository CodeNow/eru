import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql'
import {
  fromGlobalId,
  globalIdField,
  nodeDefinitions
} from 'graphql-relay'
import find from '101/find'
import hasProps from '101/has-properties'

import AWS from './aws'
import Runnable from './runnable'
Runnable.connect()

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId) => {
    const { type, id } = fromGlobalId(globalId)
    console.warn('[type] node def', type, id)
    if (type === 'Service') {
      const s = find(FAKE_SERVICES, hasProps({ id: parseInt(id, 10) }))
      return s
    } else if (type === 'Runnable') {
      return {}
    } else if (type === 'User') {
      return Runnable.getUsers(id)
    }
    return null
  },
  (obj) => {
    console.warn('[type] returning the type', JSON.stringify(obj))
    if (obj.name) {
      return serviceType
    } else if (obj.instanceId) {
      return dockType
    } else if (Object.keys(obj).length === 0) {
      return runnableType
    } else if (obj._id) {
      return userType
    }
    return null
  }
)

const FAKE_SERVICES = [
  { id: 1, name: 'Redis' },
  { id: 2, name: 'RabbitMQ' },
  { id: 3, name: 'api', version: 'v6.34.0' },
  { id: 4, name: 'api-worker', version: 'v6.34.0' }
]

const userType = new GraphQLObjectType({
  name: 'User',
  description: 'Users of Runnable.',
  fields: () => ({
    id: globalIdField('User', (u) => (u._id)),
    mongoID: {
      type: GraphQLString,
      resolve: (u) => (u._id)
    },
    githubAccessToken: {
      type: GraphQLString,
      resolve: (u) => (u.accounts.github.accessToken)
    },
    githubUsername: {
      type: GraphQLString,
      resolve: (u) => (u.accounts.github.username)
    },
    githubID: {
      type: GraphQLInt,
      resolve: (u) => (u.accounts.github.id)
    }
  }),
  interfaces: [ nodeInterface ]
})

const dockType = new GraphQLObjectType({
  name: 'Dock',
  description: 'Dock in the Runnable ecosystem.',
  fields: () => ({
    id: globalIdField('Dock', (d) => (d.InstanceId)),
    instanceId: {
      type: GraphQLString,
      resolve: (d) => (d.InstanceId)
    },
    ami: {
      type: GraphQLString,
      resolve: (d) => (d.ImageId)
    },
    org: {
      type: GraphQLString,
      resolve: (d) => {
        const t = find(d.Tags, (t) => (t.Key === 'org'))
        return t && t.Value
      }
    },
    privateIP: {
      type: GraphQLString,
      resolve: (d) => (d.PrivateIpAddress)
    }
  })
})

const serviceType = new GraphQLObjectType({
  name: 'Service',
  description: 'Services in the Runnable ecosystem.',
  fields: () => ({
    id: globalIdField('Service'),
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    version: {
      type: GraphQLString
    }
  }),
  interfaces: [ nodeInterface ]
})

const runnableType = new GraphQLObjectType({
  name: 'Runnable',
  description: 'The Runnable ecosystem.',
  fields: () => ({
    id: globalIdField('Runnable'),
    services: {
      type: new GraphQLList(serviceType),
      resolve: () => (FAKE_SERVICES)
    },
    docks: {
      type: new GraphQLList(dockType),
      resolve: () => (AWS.listDocks())
    },
    users: {
      type: new GraphQLList(userType),
      resolve: () => (Runnable.getUsers())
    },
    domain: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: () => (Runnable.DOMAIN)
    }
  }),
  interfaces: [ nodeInterface ]
})

const queryType = new GraphQLObjectType({
  name: 'Root',
  fields: () => ({
    runnable: {
      type: runnableType,
      resolve: () => ({})
    },
    node: nodeField
  })
})

export const schema = new GraphQLSchema({
  query: queryType
})
