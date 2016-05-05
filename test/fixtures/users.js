import find from '101/find'

import you from './user-data'

const users = [
  {
    accounts: {
      github: {
        id: 2194285,
        username: 'anandkumarpatel',
        accessToken: 'anandtoken'
      }
    }
  },
  {
    accounts: {
      github: {
        id: 495765,
        username: 'Myztiq',
        accessToken: 'myztiqtoken'
      }
    }
  },
  {
    accounts: {
      github: {
        id: 160236,
        username: 'bkendall',
        accessToken: 'bkendalltoken'
      }
    }
  }
]

if (!you.username || !you.id || !you.accessToken) {
  throw new Error('please setup your information in `test/fixtures/user-data`')
}

const username = you.username.toLowerCase()
const youExist = find(users, (u) => (
  u.accounts.github.username.toLowerCase() === username
))
if (!youExist) {
  users.push({ accounts: { github: you } })
}

export default users
