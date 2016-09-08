import loadenv from 'loadenv'
loadenv()

import bodyParser from 'body-parser'
import envIs from '101/env-is'
import express from 'express'
import morgan from 'morgan'
import path from 'path'
import session from 'express-session'

import { passport, GITHUB_SCOPE } from './middleware/passport'
import redisStore from './redis-session-store'

const { DOMAIN } = process.env

const app = express()

app.use(morgan('combined'))

app.use(bodyParser.json({
  extended: true
}))

app.use('/health', function (req, res) { res.send(200) } )

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

if (envIs('production')) {
  app.use(passport.initialize())
  app.use(passport.session())
}

if (envIs('development')) {
  app.use((req, res, next) => {
    req.user = require('../test/fixtures/user-data')
    next()
  })
}

app.get('/login/github',
  passport.authenticate('github', { scope: GITHUB_SCOPE.split(',') })
)

app.get('/login/github/callback',
  passport.authenticate('github', { failureRedirect: '/?failure' }),
  (req, res) => {
    if (req.session.redirectPath) {
      const newPath = req.session.redirectPath
      req.session.redirectPath = undefined
      res.redirect(newPath)
    } else {
      res.redirect('/app')
    }
  }
)

app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/?logout')
})

if (envIs('production')) {
  app.get('/app', (req, res, next) => {
    if (req.isAuthenticated()) { return next() }
    req.session.redirectPath = req.headers['x-forwarded-path'] || '/app'
    res.redirect(`/?unauthorized&path=${req.session.redirectPath}`)
  })
}

app.use(express.static(path.resolve(__dirname, '../public')))

export default app
