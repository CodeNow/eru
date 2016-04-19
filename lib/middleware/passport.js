import loadenv from 'loadenv'
loadenv({})

import { Strategy as GitHubStrategy } from 'passport-github'
import envIs from '101/env-is'
import find from '101/find'
import Github from 'github4'
import passport from 'passport'
import Promise from 'bluebird'
import redisClient from '../models/redis'

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  DOMAIN
} = process.env
const GITHUB_SCOPE = 'read:org'

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
      const github = new Github({
        headers: { 'user-agent': 'Runnable Eru' }
      })
      github.authenticate({
        type: 'oauth',
        token: accessToken
      })
      Promise.fromCallback((cb) => {
        github.users.getOrganizationMembership({ org: 'CodeNow' }, cb)
      })
        .then((info) => {
          if (info.state !== 'active') {
            throw new Error('You must be an active member of the CodeNow organization.')
          }
          return Promise.fromCallback((cb) => {
            github.orgs.getTeams({ org: 'CodeNow' }, cb)
          })
        })
        .then((teams) => {
          const eruTeam = find(teams, (t) => (t.name.toLowerCase() === 'eru'))
          if (!eruTeam) {
            throw new Error('Could not find `eru` team.')
          }
          return Promise.fromCallback((cb) => {
            github.orgs.getTeamMembership({ id: eruTeam.id, user: profile.login }, cb)
          })
        })
        .asCallback((err) => {
          done(null, err ? null : profile, err ? { message: err.message } : null)
        })
    }
  ))
}

export {
  passport,
  GITHUB_SCOPE
}
