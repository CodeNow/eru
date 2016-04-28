import React from 'react'
import Relay from 'react-relay'

import ASGRow from './ASGRow'

class AWS extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object,
    alertMessage: React.PropTypes.func.isRequired
  }

  render () {
    const {
      alertMessage,
      runnable: { aws: { asgs } }
    } = this.props
    return (
      <div className='row'>
        <div className='col-md-12'>
          <h4>ASGs</h4>
          <table className='table table-striped table-condensed table-hover'>
            <thead>
              <tr>
                <th>Organization ID</th>
                <th>ASG Name</th>
                <th>Launch Configuration Name</th>
                <th>Created</th>
                <th>Desired</th>
                <th>Current</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {
                asgs.map((asg) => (
                  <ASGRow
                    asg={asg}
                    key={asg.id}
                    alertMessage={alertMessage}
                  />
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}

export default Relay.createContainer(
  AWS,
  {
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          aws {
            asgs {
              id
              ${ASGRow.getFragment('asg')}
            }
          }
        }
      `
    }
  }
)
