import Moderate from './Moderate'
import React from 'react'
import Relay from 'react-relay'

class ModerateOrg extends Moderate {

  componentWillMount () {
    this.props.relay.setVariables({
      orgName: this.props.params.orgname
    }, readyState => {
      if (readyState.done || readyState.aborted) {
        let users = this.props.runnable.users.edges.map((u) => (u.node))
        this.setState({users})
      } else if (readyState.error) {
        this.setState({error: readyState.error});
      }
    })
  }

  componentDidUpdate () {
    if (this.state && this.state.users) {
      this.moderateUser()
    }
  }

  render () {
    const userContentDomain = this.props.runnable.userContentDomain

    if (!this.state || this.state.users) {
      return (
        <div className='col-md-6'>
          <img src={`https://blue.${userContentDomain}/pixel.gif`} style={{display: 'none'}} />
          <h2>Attempting to moderate: {this.props.params.orgName}</h2>
        </div>
      )
    } else {
      return (
        <div className='col-md-6'>
          <h2>Invalid organization.</h2>
          <p>{this.state.error ? this.state.error.message : ''}</p>
        </div>
      )
    }
  }
}

export default Relay.createContainer(
  ModerateOrg,
  {
    initialVariables: {
      orgName: null
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          domain
          userContentDomain
          users(first: 1, orgName: $orgName) {
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


