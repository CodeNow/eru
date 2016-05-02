import ES6Error from 'es6-error'

console.log('this')
import { createRedisClient } from '../lib/models/redis'
console.log('that')

const DEFAULT_TTL = 24 * 60 * 60

class CacheInvalidError extends ES6Error {}

class CacheLayer {
  constructor () {
    this.redisClient = createRedisClient()
  }

  _getKeyFromCache (key) {
    key = `eruCache::${key}`
    console.log('getting key', key)
    return this.redisClient.getAsync(key)
      .then((value) => {
        if (!value) {
          console.log('no value')
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
    // return this._getKeyFromCache(key)
    //   .catch(CacheInvalidError, () => {
        const newData = promiseMethod()
        // newData.then((data) => {
        //   this._setKeyInCache(key, JSON.stringify(data))
        // })
        return newData
      // })
  }
}

export default CacheLayer
console.log('done')
