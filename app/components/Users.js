import React from 'react'
import Relay from 'react-relay'

import ModerateUser from './ModerateUser'
import Whitelist from './Whitelist'

class Users extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  render () {
    return (
      <div className='row'>
        <ModerateUser runnable={this.props.runnable} />
        <Whitelist runnable={this.props.runnable} />
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
          ${ModerateUser.getFragment('runnable')}
          ${Whitelist.getFragment('runnable')}
        }
      `
    }
  }
)
