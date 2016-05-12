import find from '101/find'
import React from 'react'
import Relay from 'react-relay'
import cookie from 'react-cookie'

class Moderate extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  handleUserChange (e) {
    e.preventDefault()
    this.setState({ username: e.target.value })
  }

  handleSubmit (e) {
    e.preventDefault()
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

  handleOrgSelect (e) {
    this.props.relay.setVariables({
      orgID: parseInt(e.target.value, 10),
      showUsers: true
    })
  }

  render () {
    const userContentDomain = this.props.runnable.userContentDomain
    const orgs = this.props.runnable.orgs.edges.map((e) => (e.node))
    const users = this.props.runnable.users
      ? this.props.runnable.users.edges.map((u) => (u.node))
      : []
    return (
      <div className='col-md-6'>
        <img src={`https://blue.${userContentDomain}/pixel.gif`} style={{display: 'none'}}/>
        <h4>User Moderation</h4>
        <p>
          These two lists are compiled using the following logic:
        </p>
        <p>
          1. The organizations are pulled from the whitelist. This currently
          includes organizations that are disabled.
        </p>
        <p>
          2. Given the organization ID, the users are found by looking for
          instances owned by the organization, getting the usernames
          associated with the user who created it, and cross-referencing it
          with the avaiable users we have in our database (source of
          authentication).
        </p>
        <p>
          tl;dr: whitelisted organizations who have an instance can be
          moderated.
        </p>
        <form onSubmit={this.handleSubmit.bind(this)}>
          <div className='form-group'>
            <label htmlFor='organization'>Organization</label>
            <select
              id='organization'
              className='form-control'
              onChange={this.handleOrgSelect.bind(this)}
            >
              <option></option>
              {
                orgs.map((o) => (
                  <option
                    key={o.id}
                    value={o.githubID}
                  >
                    {o.githubName}
                  </option>
                ))
              }
            </select>
          </div>
          <div className='form-group'>
            <label htmlFor='username'>User</label>
            <select
              id='username'
              className='form-control'
              disabled={!users.length}
              onChange={this.handleUserChange.bind(this)}
            >
              <option></option>
              {
                users.map((u) => (
                  <option
                    key={u.id}
                    value={u.githubUsername}
                  >
                    {u.githubUsername}
                  </option>
                ))
              }
            </select>
          </div>
          <button type='submit' className='btn btn-default'>
            Moderate
          </button>
        </form>
      </div>
    )
  }
}

export default Relay.createContainer(
  Moderate,
  {
    initialVariables: {
      pageSize: 1000000,
      showUsers: false,
      orgID: null
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          userContentDomain
          orgs(first: $pageSize) {
            edges {
              node {
                id
                githubID
                githubName
              }
            }
          }
          users(first: $pageSize, orgID: $orgID) @include(if: $showUsers) {
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
