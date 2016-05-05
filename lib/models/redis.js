import loadenv from 'loadenv'
loadenv({})

import Promise from 'bluebird'
import redis from 'redis'

function createRedisClient () {
  const client = redis.createClient({
    host: process.env.REDIS_HOSTNAME,
    port: process.env.REDIS_PORT
  })
  return Promise.promisifyAll(client)
}

export { createRedisClient }
