import loadenv from 'loadenv'
loadenv()

import MongoDB from 'mongodb'
import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'

import {
  appClientFactory,
  tokenClientFactory
} from './github'

const MongoClient = Promise.promisifyAll(MongoDB.MongoClient)

const {
  MONGODB_DATABASE,
  MONGODB_HOSTS,
  MONGODB_PASSWORD,
  MONGODB_REPLSET,
  MONGODB_USERNAME,
  RUNNABLE_DOMAIN,
  USER_CONTENT_DOMAIN
} = process.env

const USER_QUERY = {
  'accounts.github.username': { $exists: true }
}
const USER_FIELDS = {
  _id: 1,
  'accounts.github.accessToken': 1,
  'accounts.github.id': 1,
  'accounts.github.username': 1
}
const USER_SORT = {
  'accounts.github.username': 1
}

const WHITELIST_QUERY = {}
const WHITELIST_FIELDS = {
  _id: 1,
  allowed: 1,
  lowerName: 1
}
const WHITELIST_SORT = {
  lowerName: 1
}

class RunnableClient {
  constructor () {
    this.DOMAIN = RUNNABLE_DOMAIN
    this.USER_CONTENT_DOMAIN = USER_CONTENT_DOMAIN
    this.rabbitmq = new RabbitMQ({})
  }

  connect () {
    if (this.db) {
      throw new Error('Do not connect to mongodb twice.')
    }
    const connOpts = {}
    if (MONGODB_REPLSET) {
      connOpts.replset = { replicaSet: `${MONGODB_REPLSET}` }
    }
    let mongoAuth = ''
    if (MONGODB_USERNAME && MONGODB_PASSWORD) {
      mongoAuth = `${MONGODB_USERNAME}:${MONGODB_PASSWORD}@`
    }
    const connString = `mongodb://${mongoAuth}${MONGODB_HOSTS}/${MONGODB_DATABASE}`
    return MongoClient.connectAsync(connString, connOpts)
      .then((db) => {
        this.db = db
      })
      .then(() => {
        return this.rabbitmq.connect()
      })
  }

  getUsers (id) {
    const query = { ...USER_QUERY }
    if (id) {
      query._id = new MongoDB.ObjectID(id)
    }
    return Promise.fromCallback((cb) => {
      const users = this.db.collection('users')
      users
        .find(query, USER_FIELDS)
        .sort(USER_SORT)
        .toArray(cb)
    })
    .then((users) => {
      if (id) { return users[0] }
      return users
    })
  }

  addOrgToWhitelist (orgName, allowed) {
    const github = appClientFactory()
    return Promise.fromCallback((cb) => {
      github.orgs.get({ org: orgName }, cb)
    })
      .then((orgInfo) => {
        const insertQuery = {
          name: orgInfo.login,
          lowerName: orgInfo.login.toLowerCase(),
          allowed: !!allowed,
          githubId: orgInfo.id
        }
        return Promise.fromCallback((cb) => {
          this.db.collection('userwhitelists')
            .insert(insertQuery, cb)
        })
          .then(({ insertedCount }) => {
            if (insertedCount !== 1) {
              throw new Error('Did not insert the user into the whitelist.')
            }
            return { id: orgInfo.id }
          })
          .tap(() => (
            this.rabbitmq.publishToExchange(
              'eru.whitelist.organization.added',
              '',
              {
                organizationID: orgInfo.id,
                organizationName: orgInfo.login.toLowerCase()
              }
            )
          ))
      })
  }

  updateOrgInWhitelist (orgName, allowed) {
    const lowerOrgName = orgName.toLowerCase()
    const searchQuery = { lowerName: lowerOrgName }
    const update = { $set: { allowed: !!allowed } }
    return Promise.fromCallback((cb) => {
      this.db.collection('userwhitelists')
        .findOneAndUpdate(searchQuery, update, cb)
    })
      .then(() => {
        if (allowed) {
          return this.rabbitmq.publishToExchange(
            'eru.whitelist.organization.allowed',
            '',
            { organizationName: lowerOrgName }
          )
        } else {
          return this.rabbitmq.publishToExchange(
            'eru.whitelist.organization.disallowed',
            '',
            { organizationName: lowerOrgName }
          )
        }
      })
  }

  removeOrgFromWhitelist (orgName) {
    const github = appClientFactory()
    return Promise.fromCallback((cb) => {
      github.orgs.get({ org: orgName }, cb)
    })
      .then((orgInfo) => {
        const removeQuery = {
          lowerName: orgInfo.login.toLowerCase()
        }
        return Promise.fromCallback((cb) => {
          this.db.collection('userwhitelists')
            .remove(removeQuery, { single: true }, cb)
        })
          .then(({ result: { n: matchedCount } }) => {
            if (matchedCount !== 1) {
              throw new Error('Did remove the user from the whitelist.')
            }
            return { id: orgInfo.id }
          })
          .tap(() => (
            this.rabbitmq.publishToExchange(
              'eru.whitelist.organization.removed',
              '',
              { organizationName: orgInfo.login.toLowerCase() }
            )
          ))
      })
  }

  getWhitelistedOrgByName (orgName) {
    const github = appClientFactory()
    return github.runThroughCache('orgs.get', { org: orgName })
      .then((orgInfo) => {
        return this.getWhitelistedOrgByID(orgInfo.id)
      })
  }

  getWhitelistedOrgByID (id) {
    const intID = parseInt(id, 10)
    const github = appClientFactory()
    return github.runThroughCache('users.getById', { id })
      .then((githubInfo) => {
        const query = {
          lowerName: githubInfo.login.toLowerCase(),
          ...WHITELIST_QUERY
        }
        return Promise.fromCallback((cb) => {
          this.db.collection('userwhitelists')
            .findOne(query, WHITELIST_FIELDS, cb)
        })
      })
      .then((org) => ({ id: intID, ...org }))
  }

  getWhitelistedOrgs (queryUser) {
    const github = queryUser && queryUser.accessToken
      ? tokenClientFactory(queryUser.accessToken)
      : appClientFactory()
    return Promise.fromCallback((cb) => {
      this.db.collection('userwhitelists')
        .find(WHITELIST_QUERY, WHITELIST_FIELDS)
        .sort(WHITELIST_SORT)
        .toArray(cb)
    })
      .map((org) => {
        return github.runThroughCache('orgs.get', { org: org.lowerName })
          .then((info) => {
            return {
              id: info.id,
              ...org
            }
          })
          .catch((err) => {
            console.error(err.stack || err.message)
            return {}
          })
      })
      .then((orgs) => {
        return orgs.filter((o) => (!!o.id))
      })
  }

  getKnownUsersForOrg (orgID) {
    return Promise.fromCallback((cb) => {
      this.db.collection('instances')
        .find({ 'owner.github': orgID }, { createdBy: 1 })
        .sort({ 'createdBy.username': 1 })
        .toArray(cb)
    })
      .then((instanceCreators) => {
        const userGithubIDs = instanceCreators.map((i) => (i.createdBy.github))
        const query = {
          'accounts.github.id': { $in: userGithubIDs },
          ...USER_QUERY
        }
        return Promise.fromCallback((cb) => {
          this.db.collection('users')
            .find(query, USER_FIELDS)
            .sort(USER_SORT)
            .toArray(cb)
        })
      })
  }

  getKnownUsersFromOrgName (orgName) {
    const github = appClientFactory()
    return Promise.fromCallback((cb) => {
      github.orgs.get({ org: orgName }, cb)
    })
      .then((orgInfo) => {
        return this.getKnownUsersForOrg(orgInfo.id)
      })
  }

}

export default new RunnableClient()
