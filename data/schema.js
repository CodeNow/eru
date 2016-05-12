import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromPromisedArray,
  cursorForObjectInConnection,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
  toGlobalId
} from 'graphql-relay'
import find from '101/find'

import AWS from './aws'
import Runnable from './runnable'
import Consul from './consul'

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId) => {
    const { type, id } = fromGlobalId(globalId)
    console.warn('[type] node def', type, id)
    if (type === 'Service') {
      return Consul.getService(id)
    } else if (type === 'Runnable') {
      return { queryUser: { id: id } }
    } else if (type === 'User') {
      return Runnable.getUsers(id)
    } else if (type === 'Organization') {
      return Runnable.getWhitelistedOrgByID(id)
    } else if (type === 'AutoScaleGroup') {
      return AWS.getASGByName(id)
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
    } else if (obj.AutoScalingGroupName) {
      return asgType
    }
    console.error('[type] failed to get the type', JSON.stringify(obj))
    return null
  }
)

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
    allowed: {
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve: (o) => (!!o.allowed)
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
    },
    stateCode: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (d) => (d.State.Code)
    },
    stateName: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (d) => (d.State.Name)
    }
  })
})

const asgType = new GraphQLObjectType({
  name: 'AutoScaleGroup',
  description: 'AWS Auto Scale Group.',
  fields: () => ({
    id: globalIdField('AutoScaleGroup', (asg) => (asg.AutoScalingGroupName)),
    name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (asg) => (asg.AutoScalingGroupName)
    },
    launchConfiguration: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (asg) => (asg.LaunchConfigurationName)
    },
    minSize: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (asg) => (asg.MinSize)
    },
    maxSize: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (asg) => (asg.MaxSize)
    },
    desiredSize: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (asg) => (asg.DesiredCapacity)
    },
    created: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (asg) => (asg.CreatedTime)
    },
    organizationID: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (asg) => (parseInt(asg.org, 10))
    },
    organizationName: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (asg) => (asg.githubOrganization)
    },
    instanceCount: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (asg) => (asg.Instances.length)
    },
    instances: {
      type: new GraphQLList(dockType),
      resolve: (asg) => (
        AWS.getInstances(asg.Instances.map((i) => (i.InstanceId)))
      )
    },
    reservedMemoryStatistics: {
      type: new GraphQLList(statisticsType),
      resolve: (asg) => (AWS.getMetricsForOrgByID(asg.AutoScalingGroupName.split('-').pop()))
    }
  }),
  interfaces: [ nodeInterface ]
})

const statisticsType = new GraphQLObjectType({
  name: 'ASGStatistic',
  fields: () => ({
    timestamp: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (s) => (s.Timestamp)
    },
    average: {
      type: new GraphQLNonNull(GraphQLFloat),
      resolve: (s) => (s.Average)
    },
    unit: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (s) => (s.Unit)
    }
  })
})

const awsType = new GraphQLObjectType({
  name: 'AWS',
  description: 'AWS information for Runnable ecosystem.',
  fields: () => ({
    id: globalIdField('AWS'),
    docks: {
      type: new GraphQLList(dockType),
      resolve: () => (AWS.listDocks())
    },
    asgs: {
      type: new GraphQLList(asgType),
      resolve: ({ queryUser }) => (AWS.listASGs(queryUser))
    }
  })
})

const serviceType = new GraphQLObjectType({
  name: 'Service',
  description: 'Services in the Runnable ecosystem.',
  fields: () => ({
    id: globalIdField('Service', (s) => (s.Key)),
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    version: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (s) => (s.Value)
    }
  }),
  interfaces: [ nodeInterface ]
})

const {
  connectionType: orgConnection,
  edgeType: OrgEdge
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
      resolve: () => (Consul.getServices())
    },
    aws: {
      type: new GraphQLNonNull(awsType),
      resolve: () => ({})
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
    },
    userContentDomain: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: () => (Runnable.USER_CONTENT_DOMAIN)
    }
  }),
  interfaces: [ nodeInterface ]
})

const ASGScaleIn = mutationWithClientMutationId({
  name: 'ASGScaleIn',
  inputFields: {
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    desiredSize: {
      type: new GraphQLNonNull(GraphQLInt)
    }
  },
  outputFields: {
    asg: {
      type: asgType,
      resolve: (payload) => (AWS.getASGByName(payload.asgName))
    }
  },
  mutateAndGetPayload: ({ name, desiredSize }) => (
    AWS.scaleInASGByName(name, desiredSize)
      .return({ asgName: name })
  )
})

const WhitelistAdd = mutationWithClientMutationId({
  name: 'WhitelistAdd',
  inputFields: {
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Github Organization to add to Whitelist.'
    },
    allowed: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Flag to enable organization on Runnable.'
    }
  },
  outputFields: {
    newOrgEdge: {
      type: OrgEdge,
      resolve: ({ githubID, queryUser }) => {
        return Promise.props({
          newOrg: Runnable.getWhitelistedOrgByID(githubID),
          allOrgs: Runnable.getWhitelistedOrgs(queryUser)
        })
          .then(({ newOrg, allOrgs }) => ({
            cursor: cursorForObjectInConnection(
              allOrgs,
              newOrg
            ),
            node: newOrg
          }))
      }
    },
    runnable: {
      type: runnableType,
      resolve: ({ queryUser }) => ({ queryUser })
    }
  },
  mutateAndGetPayload: ({ name, allowed }, _, { rootValue: { queryUser } }) => {
    return Runnable.addOrgToWhitelist(name, allowed)
      .then(({ id }) => {
        return AWS.createAWSASGCluster(id)
          .return({ id })
      })
      .then(({ id }) => ({
        githubID: id,
        queryUser
      }))
  }
})

const WhitelistToggle = mutationWithClientMutationId({
  name: 'WhitelistToggle',
  inputFields: {
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    allowed: {
      type: new GraphQLNonNull(GraphQLBoolean)
    }
  },
  outputFields: {
    org: {
      type: orgType,
      resolve: ({ orgName }) => (Runnable.getWhitelistedOrgByName(orgName))
    }
  },
  mutateAndGetPayload: ({ name, allowed }) => (
    Runnable.updateOrgInWhitelist(name, allowed)
      .return({ orgName: name })
  )
})

const WhitelistRemove = mutationWithClientMutationId({
  name: 'WhitelistRemove',
  inputFields: {
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Github Organization remove from the Whitelist.'
    }
  },
  outputFields: {
    removedOrgIDs: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: ({ removedGithubID }) => (
        toGlobalId('Organization', removedGithubID)
      )
    },
    runnable: {
      type: runnableType,
      resolve: ({ queryUser }) => ({ queryUser })
    }
  },
  mutateAndGetPayload: ({ name }, _, { rootValue: { queryUser } }) => {
    return Runnable.removeOrgFromWhitelist(name)
      .then(({ id }) => ({
        removedGithubID: id,
        queryUser
      }))
  }
})

const ASGScale = mutationWithClientMutationId({
  name: 'ASGScale',
  inputFields: {
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    desiredSize: {
      type: new GraphQLNonNull(GraphQLInt)
    },
    minSize: {
      type: GraphQLInt
    },
    maxSize: {
      type: GraphQLInt
    }
  },
  outputFields: {
    asg: {
      type: asgType,
      resolve: (payload) => {
        return AWS.getASGByName(payload.asgName)
      }
    }
  },
  mutateAndGetPayload: ({ name, desiredSize, minSize, maxSize }) => {
    return AWS.getASGByName(name)
      .then((asg) => {
        return AWS.updateASG(asg, { name, desiredSize, minSize, maxSize })
      })
      .return({ asgName: name })
  }
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

const mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    ASGScale,
    ASGScaleIn,
    WhitelistAdd,
    WhitelistRemove,
    WhitelistToggle
  })
})

export const schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType
})
