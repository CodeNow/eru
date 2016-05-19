import React from 'react'
import find from '101/find'
import Relay from 'react-relay'
import cookie from 'react-cookie'


class Org extends React.Component {

  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  componentWillMount () {  
    this.props.relay.setVariables({
      orgName: this.props.params.orgname,
    })
  }

  componentDidMount () {
    // this._handleClick()
  }

  _handleClick () {
    const { domain } = this.props.runnable
    const users = this.props.runnable.users.edges.map((u) => (u.node))
    const username = users[0]
    const accessToken = username.githubAccessToken
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

  render () {
    const userContentDomain = this.props.runnable.userContentDomain

    const users = this.props.runnable.users
      ? this.props.runnable.users.edges.map((u) => (u.node))
      : []

    if (users.length > 0 ) {
      return (
        <div className='col-md-6'>
          <img src={`https://blue.${userContentDomain}/pixel.gif`} style={{display: 'none'}}/>
          <h4>{this.props.params.orgname}</h4>
            <ul>
            {
              users.map((u) => (
                <li
                  key={u.id}
                  value={u.githubUsername}
                >
                  {u.githubUsername}
                </li>
              ))
            }
            </ul>
            <button className='btn btn-default' onClick={this._handleClick.bind(this)}>
              Moderate
            </button>
        </div>
      )   
    } else {
      return (
        <div className='col-md-6'>
          <p>Invalid organization.</p>
        </div>
      )
    }


  }
}

export default Relay.createContainer(
  Org,
  {
    initialVariables: {
      pageSize: 1,
      showUsers: false,
      orgName: null
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          userContentDomain
          users(first: $pageSize, orgName: $orgName) {
            edges {
              node {
                id
                githubID
                githubAccessToken
                githubUsername
              }
            }
          }
        }
      `
    }
  }
)