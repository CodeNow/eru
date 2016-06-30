import React from 'react'
import Relay from 'react-relay'

import moderateUser from '../utils/moderate-user'

class ModerateOrg extends React.Component {
  componentDidMount () {
    const {
      runnable: {
        domain,
        users: { edges }
      }
    } = this.props
    const users = edges.map((u) => (u.node))
    // sanity check
    if (users && Array.isArray(users) && users.length) {
      moderateUser(users[0], domain)
    }
  }

  render () {
    const {
      runnable: {
        userContentDomain,
        users
      },
      orgName
    } = this.props
    if (users && Array.isArray(users.edges) && users.edges.length) {
      return (
        <div className='col-md-6'>
          <img
            src={`https://blue.${userContentDomain}/pixel.gif`}
            style={{display: 'none'}}
          />
          <h2>Attempting to moderate: {orgName}</h2>
        </div>
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
  ModerateOrg,
  {
    initialVariables: {
      orgName: ''
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          userContentDomain
          users(first: 1, orgName: $orgName) {
            edges {
              node {
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
