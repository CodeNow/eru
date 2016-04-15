import loadenv from 'loadenv'
loadenv()

import connectRedis from 'connect-redis'
import redisClient from './models/redis'
import session from 'express-session'

const RedisStore = connectRedis(session)

export default new RedisStore({
  client: redisClient,
  prefix: 'eru-sess:'
})
