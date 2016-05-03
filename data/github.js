import loadenv from 'loadenv'
loadenv()

import Github from 'github4'

export function tokenClientFactory (token) {
  if (!token) {
    const err = new Error('oauth token is required when using token client factory')
    console.error(err.stack)
    throw err
  }
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
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new Error('client information is required when using app client factory')
  }
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
