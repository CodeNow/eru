import find from '101/find'
import React from 'react'
import Relay from 'react-relay'
import cookie from 'react-cookie'

class Moderate extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  moderateUser (username) {
    const { domain } = this.props.runnable
    const tokenString = document.cookie.split(';').filter((c) => (c.split('=')[0].indexOf('CSRF-TOKEN') > -1))[0].split('=').pop()
    if (this.props.runnable.users) {
      const users = this.props.runnable.users.edges.map((u) => (u.node))
      const user = username ? find(users, (u) => (u.githubUsername === username)) : users[0]
      const accessToken = user.githubAccessToken
      window.fetch(
        `https://api.${domain}/auth/github/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': tokenString
          },
          credentials: 'include',
          body: JSON.stringify({ accessToken })
        }
      )
        .then((res) => {
          if (res.status === 200) {
            cookie.save(
              'isModerating',
              user.githubID.toString(),
              {
                domain: '.' + domain,
                path: '/'
              }
            )
            window.location.assign(`https://${domain}/`)
          } else {
            throw new Error('Authentication Failed.')
          }
        })
        .catch((err) => {
          console.error(err)
        })
    } 
  }

}

export default Moderate
