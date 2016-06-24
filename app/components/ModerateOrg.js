import Moderate from './Moderate'
import React from 'react'
import Relay from 'react-relay'

class ModerateOrg extends Moderate {

  componentWillMount () {
    this.props.relay.setVariables({
      orgName: this.props.params.orgname,
    })
  }

  componentDidUpdate () {
    this.moderateUser()
  }

  handleClick (e) {
    e.preventDefault()
    this._moderateUser()
  }

  render () {
    const userContentDomain = this.props.runnable.userContentDomain
    const users = this.props.runnable.users
      ? this.props.runnable.users.edges.map((u) => (u.node))
      : []

    if (users.length > 0) {
      return (
        <div className='col-md-6'>
          <img src={`https://blue.${userContentDomain}/pixel.gif`} style={{display: 'none'}} />
          <h2>{this.props.params.orgname}</h2>
          <button className='btn btn-default' onClick={this._handleClick.bind(this)}>
            Moderate
          </button>
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
      pageSize: 1000,
      orgName: null,
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          userContentDomain
          users(first: $pageSize, orgName: $orgName) @include(if: $orgName) {
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
