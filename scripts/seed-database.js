import loadenv from 'loadenv'
loadenv()

import MongoDB from 'mongodb'
import Promise from 'bluebird'
import request from 'request'

import instances from '../test/fixtures/instances'
import users from '../test/fixtures/users'
import userwhitelists from '../test/fixtures/userwhitelists'
import services from '../test/fixtures/services'

const {
  CONSUL_HOST,
  RABBITMQ_HOSTNAME,
  RABBITMQ_PASSWORD,
  RABBITMQ_PORT,
  RABBITMQ_USERNAME
} = process.env
const SERVICE_PREFIX = 'runnable/environment/'

const MongoClient = Promise.promisifyAll(MongoDB.MongoClient)

const {
  MONGODB_DATABASE,
  MONGODB_HOSTS,
  MONGODB_PASSWORD,
  MONGODB_REPLSET,
  MONGODB_USERNAME
} = process.env

if (!MONGODB_DATABASE || !MONGODB_HOSTS) {
  throw new Error('MONGODB_DATABASE and MONGODB_HOSTS are required.')
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

seed().then(() => { console.log('done!') })

function seed () {
  console.log('seeding mongo')
  return MongoClient.connectAsync(connString, connOpts)
    .then((db) => {
      return Promise.resolve(db.dropDatabase())
        .catch((err) => {
          console.warn('got an error dropping the database')
          console.warn(err.stack || err.message || err)
        })
        .return(db)
    })
    .then((db) => {
      const instancePromise = Promise.resolve(
        db.collection('instances').insertMany(instances)
      )
      const usersPromise = Promise.resolve(
        db.collection('users').insertMany(users)
      )
      const whitelistPromise = Promise.resolve(
        db.collection('userwhitelists').insertMany(userwhitelists)
      )

      return Promise.all([ instancePromise, usersPromise, whitelistPromise ])
        .return(db)
    })
    .then((db) => {
      return Promise.resolve(db.close())
    })
    .then(() => {
      console.log('seeding consul')
      return Promise.each(services, (s) => {
        const opts = {
          url: `http://${CONSUL_HOST}/v1/kv/${SERVICE_PREFIX}${s.name}`,
          body: s.value
        }
        return Promise.fromCallback((cb) => {
          request.put(opts, cb)
        })
          .then((res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              throw new Error(`could not set ${s.name} in consul`)
            }
          })
      })
    })
    .then(() => {
      console.log('seeding rabbitmq')
      const requiredQueues = [ 'asg.create', 'on-dock-unhealthy' ]
      return Promise.each(requiredQueues, (q) => {
        const opts = {
          url: `http://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOSTNAME}:${RABBITMQ_PORT + 1}/api/queues/%2f/${q}`,
          json: { durable: true }
        }
        return Promise.fromCallback((cb) => {
          request.put(opts, cb)
        })
          .then((res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              throw new Error(`could not create queue ${q} in rabbitmq`)
            }
          })
      })
    })
}
