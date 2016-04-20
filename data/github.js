import loadenv from 'loadenv'
loadenv()

import Github from 'github4'

export function tokenClientFactory (token) {
  const github = new Github({
    headers: { 'user-agent': 'Runnable Eru' }
  })
  github.authenticate({
    type: 'oauth',
    token
  })
  return github
}

export function appClientFactory () {
  const github = new Github({
    headers: { 'user-agent': 'Runnable Eru' }
  })
  github.authenticate({
    type: 'oauth',
    key: process.env.GITHUB_CLIENT_ID,
    secret: process.env.GITHUB_CLIENT_SECRET
  })
  return github
}
