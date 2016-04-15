import loadenv from 'loadenv'
loadenv()

import assign from '101/assign'
import Promise from 'bluebird'
import MongoDB from 'mongodb'

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

class Mongo {
  constructor () {
    this.DOMAIN = RUNNABLE_DOMAIN
  }

  connect () {
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
    let query = assign({}, USER_QUERY)
    if (id) {
      query._id = new MongoDB.ObjectID(id)
    }
    return Promise.fromCallback((cb) => {
      const users = this.db.collection('users')
      users
        .find(query, USER_FIELDS)
        .sort({ 'accounts.github.username': 1 })
        .toArray(cb)
    })
    .then((users) => {
      if (id) { return users[0] }
      return users
    })
  }
}

export default new Mongo()
