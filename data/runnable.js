import loadenv from 'loadenv'
loadenv()

import MongoDB from 'mongodb'
import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'

import BigPoppaClient from '@runnable/big-poppa-client'

import {
  appClientFactory
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

  matchUserInGithub (user) {
    const github = appClientFactory()
    return github.runThroughCache('users.getById', { id: user.githubId })
      .then((info) => {
        return {
          id: user.githubId,
          accounts: {
            github: {
              id: user.githubId,
              username: info.login,
              accessToken: user.accessToken
            }
          }
        }
      })
  }

  getUsers (id) {
    const data = id ? { githubId: id } : {}
    return this.bigPoppa.getUsers(data)
      .mapSeries(this.matchUserInGithub)
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

  /**
   * Updates the isActive field in BigPoppa based off of the allowed input
   *
   * @param {String}  orgName - Org's name in Github
   * @param {Boolean} allowed - setting to false will disable to the org's backend
   *
   * @resolves {Undefined}
   * @throws   {Error}     when the org can't be located in BigPoppa
   */
  updateOrgInWhitelist (orgName, allowed) {
    const lowerOrgName = orgName.toLowerCase()
    const searchQuery = { name: orgName }
    const update = { isActive: !!allowed }
    return this.bigPoppa.getOrganizations(searchQuery)
      .get('0')
      .tap(org => {
        if (!org) {
          throw new Error('Could not find org in bigPoppa', { searchQuery: searchQuery })
        }
      })
      .then(org => {
        return this.bigPoppa.updateOrganization(org.id, update)
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

    const data = id ? { githubId: id } : {}
    return this.bigPoppa.getOrganizations(data)
      .then((org) => ({ id: intID, ...org }))
  }

  getWhitelistedOrgs () {
    const log = this.log.child({ method: 'getWhitelistedOrgs' })
    const github = appClientFactory()
    return this.bigPoppa.getOrganizations()
      .mapSeries((org) => {
        return github.runThroughCache('users.getById', { id: org.githubId })
          .then((info) => {
            return {
              ...org,
              id: info.id,
              lowerName: info.login.toLowerCase()
            }
          })
          .catch((err) => {
            log.error(
              { err, args: { org: org.lowerName } },
              'error when getting organization info'
            )
            return {}
          })
      })
      .then((orgs) => {
        return orgs.filter((o) => (!!o.id))
      })
  }

  /**
   * Fetches all of the user models for an org
   *
   * @param {String} orgID - github Id for the org
   *
   * @resolves {[User]} all of the users for an org
   * @throws   {Error}     when the org can't be located in BigPoppa
   */
  getKnownUsersForOrg (orgID) {
    return this.bigPoppa.getOrganizations({ githubId: orgID })
      .get('0')
      .tap(org => {
        if (!org) {
          throw new Error('Could not find org in bigPoppa', { orgID: orgID })
        }
      })
      .get('users')
      .mapSeries(user => {
        return this.bigPoppa.getUser(user.id)
      })
      .mapSeries(this.matchUserInGithub)
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
