import loadenv from 'loadenv'
loadenv({})

import Promise from 'bluebird'
import redis from 'redis'

Promise.promisifyAll(redis.RedisClient.prototype)

const client = redis.createClient({
  host: process.env.REDIS_HOSTNAME,
  port: process.env.REDIS_PORT
})

export default client
