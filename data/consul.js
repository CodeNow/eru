import loadenv from 'loadenv'
loadenv()

import Promise from 'bluebird'
import request from 'request'

const { CONSUL_HOST } = process.env
const SERVICE_PREFIX = 'runnable/environment/'

class Consul {
  static _makeRequest (url) {
    return Promise.fromCallback((cb) => {
      request.get(url, {}, cb)
    }, { multiArgs: true })
      .spread((res, body) => {
        return JSON.parse(body)
      })
      .map((v) => {
        return {
          ...v,
          Value: v.Value ? (new Buffer(v.Value, 'base64')).toString('utf-8') : ''
        }
      })
      .catch((err) => {
        console.error(err.stack || err.message)
      })
  }

  static _getRecursiveKV (prefix) {
    return Consul._makeRequest(`http://${CONSUL_HOST}/v1/kv/${prefix}?recurse=true`)
  }

  static getKV (key) {
    return Consul._makeRequest(`http://${CONSUL_HOST}/v1/kv/${key}`)
      .then((values) => (values.length ? values[0] : null))
  }

  static getServices () {
    return Consul._getRecursiveKV(SERVICE_PREFIX)
      .map((value) => ({
        ...value,
        name: value.Key.substr(SERVICE_PREFIX.length)
      }))
  }

  static getService (key) {
    return Consul.getKV(key)
      .then((value) => {
        return {
          ...value,
          name: value.Key.substr(SERVICE_PREFIX.length)
        }
      })
  }
}

export default Consul
