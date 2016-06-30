import loadenv from 'loadenv'
loadenv()

import Promise from 'bluebird'
import request from 'request'

import logger from '../lib/logger'
const log = logger.child({
  module: 'data/consul',
  model: 'consul'
})

const { CONSUL_HOST } = process.env
const SERVICE_PREFIX = 'runnable/environment/'

class Consul {
  static _makeRequest (url) {
    const _log = log.child({ method: '_makeRequest' })
    _log.trace({ url }, 'making a request')
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
        _log.error({ err }, 'error while making request')
        throw err
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
