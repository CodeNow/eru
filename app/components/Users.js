import find from '101/find'
import React from 'react'
import Relay from 'react-relay'

class Users extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object
  }

  handleChange (e) {
    e.preventDefault()
    this.setState({ username: e.target.value })
  }

  handleSubmit (e) {
    e.preventDefault()
    const {
      domain,
      users
    } = this.props.runnable
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
          window.redirect(`https://${domain}/`)
        } else {
          throw new Error('Authentication Failed.')
        }
      })
      .catch((err) => {
        console.error(err)
      })
  }

  render () {
    const {
      users
    } = this.props.runnable
    return (
      <div className='row'>
        <div className='col-md-4'>
          <h4>User Moderation</h4>
          <form onSubmit={this.handleSubmit.bind(this)}>
            <div className='form-group'>
              <label htmlFor='username'>User</label>
              <select
                id='username'
                className='form-control'
                onChange={this.handleChange.bind(this)}
              >
                <option></option>
                {
                  users.map((u) => (
                    <option
                      key={ u.id }
                      value={ u.githubUsername }
                    >
                      { u.githubUsername }
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
      </div>
    )
  }
}

export default Relay.createContainer(
  Users,
  {
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          users {
            id
            githubUsername
            githubAccessToken
          }
        }
      `
    }
  }
)
