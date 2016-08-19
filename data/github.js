import loadenv from 'loadenv'
loadenv()

import crypto from 'crypto'
import isFunction from '101/is-function'
import Keypather from 'keypather'
import Github from 'github4'
import Promise from 'bluebird'

import cacheLayer from './cache-layer'
import logger from '../lib/logger'

const keypather = Keypather()
const log = logger.child({ module: 'data/github' })

export function tokenClientFactory (token) {
  if (!token) {
    const err = new Error(
      'oauth token is required when using token client factory'
    )
    log.error({ err }, err.message)
    throw err
  }
  const github = new Github({
    host: process.env.GITHUB_VARNISH_HOST,
    port: process.env.GITHUB_VARNISH_PORT,
    headers: { 'user-agent': 'Runnable Eru User' }
  })
  github.authenticate({
    type: 'oauth',
    token
  })
  const hash = crypto.createHash('sha256')
  hash.update(`eru::${token}`)
  return extendGithubWithCacheFunction(github, hash.digest('base64'))
}

export function appClientFactory () {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new Error(
      'client information is required when using app client factory'
    )
  }
  const github = new Github({
    headers: { 'user-agent': 'Runnable Eru Server' }
  })
  github.authenticate({
    type: 'oauth',
    key: process.env.GITHUB_CLIENT_ID,
    secret: process.env.GITHUB_CLIENT_SECRET
  })
  return extendGithubWithCacheFunction(github, 'servertoserver')
}

function extendGithubWithCacheFunction (github, clientKey) {
  const _log = log.child({ method: 'extendGithubWithCacheFunction' })
  github.clientKey = clientKey
  github.runThroughCache = Promise.method((method, options) => {
    const fn = keypather.get(github, method)
    if (!isFunction(fn)) {
      throw new Error(`no github method ${method}`)
    }
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(options))
    const optionsHash = hash.digest('base64')
    const etagKey = `${github.clientKey}:${method}:::${optionsHash}`
    return cacheLayer._getKeyFromCache(etagKey)
      .catch(cacheLayer.CacheInvalidError, () => {
        _log.trace('data was not in the cache')
      })
      .then((etag) => {
        if (!etag) {
          const dataPromise = Promise.fromCallback((cb) => { fn(options, cb) })
          dataPromise.then((result) => {
            const valueKey = `${github.clientKey}:` +
              `${method}:::${result.meta.etag}`
            return Promise.all([
              cacheLayer._setKeyInCache(etagKey, result.meta.etag),
              cacheLayer._setKeyInCache(valueKey, result)
            ])
          })
          return dataPromise
        } else {
          const valueKey = `${github.clientKey}:${method}:::${etag}`
          const dataPromise = cacheLayer._getKeyFromCache(valueKey)
          dataPromise.then(() => {
            if (!options.headers) { options.headers = {} }
            options.headers['If-None-Match'] = etag
            return Promise.fromCallback((cb) => { fn(options, cb) })
              .then((result) => {
                const valueKey = `${github.clientKey}:` +
                  `${method}:::${result.meta.etag}`
                if (/^304.+$/.test(result.meta.status)) {
                  return Promise.all([
                    cacheLayer._resetTTLForKey(etagKey),
                    cacheLayer._resetTTLForKey(valueKey)
                  ])
                } else {
                  return Promise.all([
                    cacheLayer._setKeyInCache(etagKey, result.meta.etag),
                    cacheLayer._setKeyInCache(valueKey, result)
                  ])
                }
              })
          })
          return dataPromise
        }
      })
  })
  return github
}
