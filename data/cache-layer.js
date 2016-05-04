import ES6Error from 'es6-error'
import moment from 'moment'

import { createRedisClient } from '../lib/models/redis'

const DEFAULT_TTL = 1 * 60 // 1 minute, good for testing.

class CacheInvalidError extends ES6Error {}

class CacheLayer {
  constructor () {
    this.redisClient = createRedisClient()
    this.CACHE_PREFIX = 'eruCache::'
  }

  _getKeyFromCache (key) {
    key = `eruCache::${key}`
    return this.redisClient.getAsync(key)
      .then((value) => {
        if (!value) {
          throw new CacheInvalidError()
        }
        return JSON.parse(value)
      })
  }

  _setKeyInCache (key, value, ttl) {
    key = `eruCache::${key}`
    return this.redisClient.setexAsync(key, ttl || DEFAULT_TTL, value)
  }

  runAgainstCache (key, promiseMethod) {
    return this._getKeyFromCache(key)
      .catch(CacheInvalidError, () => {
        const newData = promiseMethod()
        newData.then((data) => {
          this._setKeyInCache(key, JSON.stringify(data))
        })
        return newData
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
  }
}

export default CacheLayer
