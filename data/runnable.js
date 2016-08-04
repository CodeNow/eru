import loadenv from 'loadenv'
loadenv()

import MongoDB from 'mongodb'
import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'

import BigPoppaClient from '@runnable/big-poppa-client'

import {
  appClientFactory,
  tokenClientFactory
} from './github'
import logger from '../lib/logger'

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
    this.bigPoppa = new BigPoppaClient(process.env.BIG_POPPA_HOST)
    this.log = logger.child({
      module: 'data/runnable',
      model: 'RunnableClient'
    })
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
    const data = id ? { githubId: id } : null
    return this.bigPoppa.getUsers(data)
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

    const data = id ? { githubId: id } : null
    return this.bigPoppa.getOrganizations(data)
      .then((org) => ({ id: intID, ...org }))
  }

  getWhitelistedOrgs () {
    return this.bigPoppa.getOrganizations()
  }

  getKnownUsersForOrg (orgID) {
    return this.bigPoppa.getOrganizations({ githubId: orgID })
      .get('0')
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
