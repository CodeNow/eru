import React from 'react'
import find from '101/find'
import Relay from 'react-relay'
import cookie from 'react-cookie'
import Loading from './Loading'

class Org extends React.Component {

  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  componentWillMount () {  
    this.props.relay.setVariables({
      orgName: this.props.params.orgname,
      ready: true
    })
    this.setState({
      ready: true
    })
  }

  componentDidUpdate () {
    this._moderateUser()
  }

  _moderateUser() {
    const users = this.props.runnable.users
      ? this.props.runnable.users.edges.map((u) => (u.node))
      : []

    if (users.length > 0) {
      const { domain } = this.props.runnable
      const user = users[0]
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

  _handleClick () {
    this._moderateUser();
  }

  render () {
    const userContentDomain = this.props.runnable.userContentDomain
    const users = this.props.runnable.users
      ? this.props.runnable.users.edges.map((u) => (u.node))
      : []

    if (users.length > 0) {
      return (
        <div className='col-md-6'>
          <img src={`https://blue.${userContentDomain}/pixel.gif`} style={{display: 'none'}}/>
          <h2>{this.props.params.orgname}</h2>
          <button className='btn btn-default' onClick={this._handleClick.bind(this)}>
            Moderate
          </button>
        </div>
      )   
    } else if (!this.state.ready) {
      return (
        <Loading />
      )
    } else {
      return (
        <div className='col-md-6'>
          <h2>Invalid organization.</h2>
        </div>
      )
    }
  }
}

export default Relay.createContainer(
  Org,
  {
    initialVariables: {
      pageSize: 1000,
      orgName: null,
      ready: false
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          userContentDomain
          users(first: $pageSize, orgName: $orgName) @include(if: $ready) {
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