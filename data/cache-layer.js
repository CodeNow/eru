import loadenv from 'loadenv'
loadenv({})

import ES6Error from 'es6-error'
import moment from 'moment'
import immutable from 'immutable'
import Promise from 'bluebird'

import { createRedisClient } from '../lib/models/redis'

const DEFAULT_TTL = process.env.CACHE_DEFAULT_TTL_SECONDS

class CacheInvalidError extends ES6Error {}

class CacheLayer {
  constructor () {
    this.CACHE_PREFIX = 'eruCache::'
    this.inflight = new immutable.Map()
  }

  connect () {
    return Promise.try(() => {
      this.redisClient = createRedisClient()
    })
  }

  _resetTTLForKey (key, ttl) {
    key = `${this.CACHE_PREFIX}::${key}`
    return this.redisClient.expireAsync(key, ttl || DEFAULT_TTL)
  }

  _getKeyFromCache (key) {
    key = `${this.CACHE_PREFIX}::${key}`
    return this.redisClient.getAsync(key)
      .then((value) => {
        if (!value) {
          return null
        }
        return JSON.parse(value)
      })
  }

  _setKeyInCache (key, value, ttl) {
    key = `${this.CACHE_PREFIX}::${key}`
    return this.redisClient.setexAsync(key, ttl || DEFAULT_TTL, JSON.stringify(value))
  }

  runAgainstCache (key, promiseMethod) {
    return this._getKeyFromCache(key)
      .then((data) => {
        let dataPromise
        let refreshCache = false
        if (data) {
          console.log('we got cached data!')
          dataPromise = Promise.resolve(data)
          refreshCache = true
        } else {
          console.log('we need to fetch data')
          // if we don't have an inflight request, we need one
          if (!this.inflight.has(key)) {
            console.log('we need to create a request for the data')
            this.inflight = this.inflight.set(key, promiseMethod())
            refreshCache = true
          } else {
            console.log('there is already a request inflight')
          }
          dataPromise = this.inflight.get(key)
        }
        if (refreshCache) {
          console.log('we are going to refresh the data in the background')
          let refreshData = dataPromise
          if (!this.inflight.has(key)) {
            console.log('we need to create a request for the background refresh')
            this.inflight = this.inflight.set(key, promiseMethod())
            refreshData = this.inflight.get(key)
          }
          refreshData
            .then((data) => (this._setKeyInCache(key, data)))
            .then(() => {
              this.inflight = this.inflight.delete(key)
            })
        }
        return dataPromise
      })
  }

  saveTimestampedData (orgID, datapoints) {
    // ZADD KEY   SCORE     MEMBER [SCORE     MEMBER...]
    // ZADD ORGID TIMESTAMP VALUE  [TIMESTAMP VALUE ...]
    // let's save the unit too, for now. do `VALUE::UNIT`
    const scoresAndMembers = []
    datapoints.forEach((d) => {
      // moment parse w/ unix timestamp (in seconds)
      // also ensure that it is rounded to the beginning of the minute
      const timestamp = moment(d.Timestamp, 'X').startOf('minute')
      scoresAndMembers.push(timestamp.unix())
      scoresAndMembers.push(`${timestamp.format()}::${d.Average}::${d.Unit}`)
    })
    return this.redisClient.zaddAsync(
      `${this.CACHE_PREFIX}timestampedData::${orgID}`,
      scoresAndMembers
    )
  }

  getTimestampedData (orgID, start, stop) {
    // moment parse w/ unix timestamp (in seconds)
    // also ensure that it is rounded to the beginning of the minute
    const min = moment.isMoment(start)
      ? start
      : moment(start, 'X').startOf('minute')
    const max = moment.isMoment(stop)
      ? stop
      : moment(stop, 'X').startOf('minute')
    return this.redisClient.zrangebyscoreAsync(
      `${this.CACHE_PREFIX}timestampedData::${orgID}`,
      min.unix(),
      max.unix()
    )
      .then((cachedData) => {
        return cachedData.map((d) => {
          let [ Timestamp, Average, Unit ] = d.split('::')
          Timestamp = moment(Timestamp).unix()
          return { Timestamp, Average, Unit }
        })
      })
  }
}

const cache = new CacheLayer()
cache.CacheInvalidError = CacheInvalidError

export default cache
