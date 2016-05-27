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

import Runnable from '../data/runnable'
Runnable.connect()

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
    req.user = require('../test/fixtures/user-data')
    next()
  })
}

if (envIs('production')) {
  app.use(passport.initialize())
  app.use(passport.session())

  app.use(function (req, res, next) {
    if (req.isAuthenticated()) { return next() }
    req.session.redirectPath = req.originalUrl
    res.redirect(`/?unauthorized&path=${req.originalUrl}`)
  })
}

app.use('/', graphQLHTTP((req) => ({
  schema,
  rootValue: {
    queryUser: req.user
  },
  pretty: true,
  graphiql: true
})))

export default app
