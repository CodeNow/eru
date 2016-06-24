import React from 'react'
import Relay from 'react-relay'

import ASGRow from './ASGRow'

class AWS extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object,
    alertMessage: React.PropTypes.func.isRequired
  }

  constructor (...args) {
    super(...args)
    this.state = { hideZeros: false }
  }

  _handleHideButtonPress = (ref) => {
    this.setState({ hideZeros: !this.state.hideZeros })
  }

  render () {
    const { alertMessage } = this.props
    let { runnable: { aws: { asgs } } } = this.props
    if (this.state.hideZeros) {
      asgs = asgs.filter((a) => (a.desiredSize))
    }
    return (
      <div className='row'>
        <div className='col-md-12'>
          <h4>ASGs</h4>
          <button
            className='btn btn-default'
            onClick={this._handleHideButtonPress}
          >
            {(this.state.hideZeros ? 'Show' : 'Hide') + ' Empty ASGs'}
          </button>
          <table className='table table-striped table-condensed table-hover'>
            <thead>
              <tr>
                <th>Organization ID</th>
                <th>Launch Configuration Name</th>
                <th>Desired</th>
                <th>Current</th>
                <th>Swarm Reserved Memory</th>
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
              desiredSize
              ${ASGRow.getFragment('asg')}
            }
          }
        }
      `
    }
  }
)
