import bodyParser from 'body-parser'
import envIs from '101/env-is'
import express from 'express'
// import httpProxy from 'http-proxy'
import morgan from 'morgan'
import path from 'path'
import session from 'express-session'

import { passport, GITHUB_SCOPE } from './middleware/passport'
import redisStore from './redis-session-store'
import userData from '../test/fixtures/user-data'

var app = express()

app.use(morgan('combined'))

// if (envIs('development')) {
//   const {
//     APP_PORT,
//     BASE_URL,
//     GRAPHQL_PORT
//   } = process.env
//   const proxy = httpProxy.createProxy({
//     target: BASE_URL.replace(APP_PORT, GRAPHQL_PORT)
//   })
//   app.all('/graphql', (req, res) => {
//     proxy.proxyRequest(req, res, err => console.log(err))
//   })
// }

app.use(bodyParser.json({
  extended: true
}))

app.use(session({
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
    req.user = userData
    next()
  })
}

app.get('/login/github',
  passport.authenticate('github', { scope: GITHUB_SCOPE.split(',') })
)

app.get('/login/github/callback',
  passport.authenticate('github', { failureRedirect: '/?failure' }),
  (req, res) => { res.redirect('/app') }
)

app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/?logout')
})

if (envIs('production')) {
  app.get('/app', (req, res, next) => {
    // if (req.isAuthenticated()) { return next() }
    console.log(req.user, req.isAuthenticated())
    // res.redirect(`/?unauthorized&path=${req.path}`)
    next()
  })
}

app.use(express.static(path.resolve(__dirname, '../public')))

export default app
