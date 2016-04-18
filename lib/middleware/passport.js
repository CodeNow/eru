import loadenv from 'loadenv'
loadenv({})

import { Strategy as GitHubStrategy } from 'passport-github'
import envIs from '101/env-is'
import passport from 'passport'
import redisClient from '../models/redis'

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  DOMAIN
} = process.env
const GITHUB_SCOPE = 'repo'

if (envIs('production')) {
  passport.serializeUser((user, done) => {
    console.log(`serializing ${user.id}`)
    const userData = JSON.stringify(user)
    redisClient.set(`eru-ghUser.${user.id}`, userData, (err) => {
      if (err) { return done(err) }
      done(null, user.id)
    })
  })

  passport.deserializeUser((userId, done) => {
    console.log(`deserializing ${userId}`)
    redisClient.get(`eru-ghUser.${userId}`, (err, data) => {
      if (err) { return done(err) }
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
