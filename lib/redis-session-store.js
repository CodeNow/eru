import loadenv from 'loadenv'
loadenv()

import { createRedisClient } from './models/redis'
import connectRedis from 'connect-redis'
import session from 'express-session'

const redisClient = createRedisClient()

const RedisStore = connectRedis(session)

export default new RedisStore({
  client: redisClient,
  prefix: 'eru-sess:'
})
