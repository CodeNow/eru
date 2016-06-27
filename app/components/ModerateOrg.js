import Moderate from './Moderate'
import React from 'react'
import Relay from 'react-relay'

class ModerateOrg extends Moderate {

  componentWillMount () {
    this.props.relay.setVariables({
      orgName: this.props.params.orgname,
      ready: true
    }, readyState => {
      if (readyState.done || readyState.aborted) {
        console.log(this.props.relay.variables)
        this.setState({users:this.props.runnable.users})
      } else if (readyState.error) {
        this.setState({error: readyState.error});
      }
    })
  }

  componentDidUpdate () {
    console.log('Fired')
    if (this.state && this.state.users) {
      this.moderateUser(this.state.users[0])
    }
  }

  render () {
    const userContentDomain = this.props.runnable.userContentDomain
    // const users = this.props.runnable.users
    //   ? this.props.runnable.users.edges.map((u) => (u.node))
    //   : []

    if (!this.state || this.state.users) {
      return (
        <div className='col-md-6'>
          <img src={`https://blue.${userContentDomain}/pixel.gif`} style={{display: 'none'}} />
          <h2>Trying to moderate: {this.props.params.orgname}</h2>
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
