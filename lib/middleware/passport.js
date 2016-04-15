import loadenv from 'loadenv'
loadenv({})

import envIs from '101/env-is'
import passport from 'passport'
import redisClient from '../models/redis'
import { Strategy as GitHubStrategy } from 'passport-github'

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  DOMAIN
} = process.env
const GITHUB_SCOPE = 'repo'

if (envIs('production')) {
  passport.serializeUser((user, done) => {
    const userData = JSON.stringify(user)
    redisClient.set(`ghUser.${user.id}`, userData, (err) => {
      if (err) { throw err }
      done(null, user.id)
    })
  })
  passport.deserializeUser((userId, done) => {
    redisClient.get(`ghUser.${userId}`, (err, data) => {
      if (err) { throw err }
      if (!data) { throw new Error('did not get user data') }
      done(null, JSON.parse(data))
    })
  })

  passport.use(new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: `https://${DOMAIN}/login/github/callback`
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken
      profile.login = profile.username
      done(null, profile)
    }
  ))
}

export {
  passport,
  GITHUB_SCOPE
}
