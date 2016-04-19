import loadenv from 'loadenv'
loadenv()

import envIs from '101/env-is'
import express from 'express'
import graphQLHTTP from 'express-graphql'
import morgan from 'morgan'
import session from 'express-session'

import { passport } from './middleware/passport'
import { schema } from '../data/schema'
import redisStore from './redis-session-store'
import userData from '../test/fixtures/user-data'

const { DOMAIN } = process.env

const app = express()

app.use(morgan('combined'))

app.use(session({
  cookie: {
    path: '/',
    httpOnly: true,
    secure: true,
    maxAge: 86400000,
    domain: DOMAIN
  },
  name: 'cookie.eru.sid',
  proxy: true,
  resave: false,
  saveUninitialized: false,
  secret: 'secrets',
  store: redisStore
}))

if (envIs('development')) {
  app.use(function (req, res, next) {
    req.user = userData
    next()
  })
}

if (envIs('production')) {
  app.use(passport.initialize())
  app.use(passport.session())

  app.use(function (req, res, next) {
    if (req.isAuthenticated()) { return next() }
    res.redirect(`/?unauthorized&path=${req.path}`)
  })
}

app.use('/', graphQLHTTP((req) => ({
  schema,
  rootValue: {},
  pretty: true,
  graphiql: true
})))

export default app
