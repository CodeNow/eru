import envIs from '101/env-is'
import express from 'express'
import graphQLHTTP from 'express-graphql'
import morgan from 'morgan'
import session from 'express-session'

import { passport } from './middleware/passport'
import { schema } from '../data/schema'
import redisStore from './redis-session-store'
import userData from '../test/fixtures/user-data'

var app = express()

app.use(morgan('combined'))

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'secrets',
  store: redisStore
}))

if (envIs('production')) {
  app.use(passport.initialize())
  app.use(passport.session())

  app.use(function (req, res, next) {
    if (req.isAuthenticated()) { return next() }
    res.redirect(`/?unauthorized&path=${req.path}`)
  })
}

if (envIs('development')) {
  app.use(function (req, res, next) {
    req.user = userData
    next()
  })
}

app.use('/', graphQLHTTP(req => ({
  schema,
  rootValue: {},
  pretty: true,
  graphiql: true
})))

export default app
