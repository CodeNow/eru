import loadenv from 'loadenv'
loadenv()

import Promise from 'bluebird'
import MongoDB from 'mongodb'

import { tokenClientFactory } from './github'

const MongoClient = Promise.promisifyAll(MongoDB.MongoClient)

const {
  MONGODB_DATABASE,
  MONGODB_HOSTS,
  MONGODB_PASSWORD,
  MONGODB_REPLSET,
  MONGODB_USERNAME,
  RUNNABLE_DOMAIN
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

class Mongo {
  constructor () {
    this.DOMAIN = RUNNABLE_DOMAIN
  }

  connect () {
    if (this.db) {
      throw new Error('Do not connect to mongodb twice.')
    }
    const connString = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOSTS}/${MONGODB_DATABASE}`
    const connOpts = {
      replset: {
        replicaSet: `${MONGODB_REPLSET}`
      }
    }
    return MongoClient.connectAsync(connString, connOpts)
      .then((db) => {
        this.db = db
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

  getWhitelistedOrg (id) {
    const intID = parseInt(id, 10)
    return Promise.fromCallback((cb) => {
      this.db.collection('instances')
        .findOne({ 'owner.github': intID }, { owner: 1 }, cb)
    })
      .then((info) => {
        const query = {
          lowerName: info.owner.username,
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
    const github = tokenClientFactory(queryUser.accessToken)
    return Promise.fromCallback((cb) => {
      this.db.collection('userwhitelists')
        .find(WHITELIST_QUERY, WHITELIST_FIELDS)
        .sort(WHITELIST_SORT)
        .toArray(cb)
    })
      .map((org) => {
        return Promise.fromCallback((cb) => {
          github.orgs.get({ org: org.lowerName }, cb)
        })
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
}

export default new Mongo()
