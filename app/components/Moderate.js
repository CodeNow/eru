import find from '101/find'
import React from 'react'
import Relay from 'react-relay'
import cookie from 'react-cookie'

class Moderate extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  moderateUser () {
    const { domain } = this.props.runnable
    const users = this.props.runnable.users.edges.map((u) => (u.node))
    if (!this.state || !this.state.username) {
      console.warn('No username was selected.')
      return
    }
    const username = this.state.username.trim()
    const user = find(users, (u) => (u.githubUsername === username))
    const accessToken = user.githubAccessToken
    const tokenString = document.cookie.split(';').filter((c) => (c.split('=')[0].indexOf('CSRF-TOKEN') > -1))[0].split('=').pop()
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

export default Moderate
