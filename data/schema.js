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
  nodeDefinitions,
  connectionArgs,
  connectionFromPromisedArray,
  connectionDefinitions
} from 'graphql-relay'
import find from '101/find'
import hasProps from '101/has-properties'

import AWS from './aws'
import Runnable from './runnable'

import userData from '../test/fixtures/user-data'

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId) => {
    const { type, id } = fromGlobalId(globalId)
    console.warn('[type] node def', type, id)
    if (type === 'Service') {
      const s = find(FAKE_SERVICES, hasProps({ id: parseInt(id, 10) }))
      return s
    } else if (type === 'Runnable') {
      return { queryUser: userData }
    } else if (type === 'User') {
      return Runnable.getUsers(id)
    } else if (type === 'Organization') {
      return Runnable.getWhitelistedOrg(id)
    }
    console.error('[type] node def failed', type, id)
    return null
  },
  (obj) => {
    console.warn('[type] returning the type', JSON.stringify(obj))
    if (obj.name) {
      return serviceType
    } else if (obj.instanceId) {
      return dockType
    } else if (obj.queryUser) {
      return runnableType
    } else if (obj._id && obj.accounts) {
      return userType
    } else if (obj._id && obj.allowed && obj.lowerName) {
      return orgType
    }
    console.error('[type] failed to get the type', JSON.stringify(obj))
    return null
  }
)

const FAKE_SERVICES = [
  { id: 1, name: 'Redis' },
  { id: 2, name: 'RabbitMQ' },
  { id: 3, name: 'api', version: 'v6.34.0' },
  { id: 4, name: 'api-worker', version: 'v6.34.0' }
]

const orgType = new GraphQLObjectType({
  name: 'Organization',
  description: 'Organizations in Runnable.',
  fields: () => ({
    id: globalIdField('Organization'),
    mongoID: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (o) => (o._id)
    },
    githubID: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (o) => (o.id)
    },
    githubName: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (o) => (o.lowerName)
    },
    users: {
      type: userConnection,
      description: 'Users who are in Runnable and belong to this organization.',
      args: connectionArgs,
      resolve: (o, args) => {
        return connectionFromPromisedArray(
          Runnable.getKnownUsersForOrg(o.id),
          args
        )
      }
    }
  }),
  interfaces: [ nodeInterface ]
})

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

const {
  connectionType: orgConnection
} = connectionDefinitions({ nodeType: orgType })

const {
  connectionType: userConnection
} = connectionDefinitions({ nodeType: userType })

const runnableType = new GraphQLObjectType({
  name: 'Runnable',
  description: 'The Runnable ecosystem.',
  fields: () => ({
    id: globalIdField('Runnable', (r) => (r.queryUser.id)),
    services: {
      type: new GraphQLList(serviceType),
      resolve: () => (FAKE_SERVICES)
    },
    docks: {
      type: new GraphQLList(dockType),
      resolve: () => (AWS.listDocks())
    },
    orgs: {
      type: orgConnection,
      description: 'Organizations of the Runnable ecosystem.',
      args: connectionArgs,
      resolve: ({ queryUser }, args) => {
        return connectionFromPromisedArray(
          Runnable.getWhitelistedOrgs(queryUser),
          args
        )
      }
    },
    users: {
      type: userConnection,
      description: 'Users of the Runnable ecosystem.',
      args: {
        orgID: {
          type: GraphQLInt,
          description: 'Github Organization ID.'
        },
        ...connectionArgs
      },
      resolve: (_, args) => {
        let users
        if (args.orgID) {
          users = Runnable.getKnownUsersForOrg(args.orgID)
        } else {
          users = Runnable.getUsers()
        }
        return connectionFromPromisedArray(users, args)
      }
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
      resolve: ({ queryUser }) => {
        return { queryUser }
      }
    },
    node: nodeField
  })
})

export const schema = new GraphQLSchema({
  query: queryType
})
