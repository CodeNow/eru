import React from 'react'
import Relay from 'react-relay'

class Docks extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object,
    environment: React.PropTypes.string,
    relay: React.PropTypes.object.isRequired
  }

  render () {
    const { docks } = this.props.runnable
    return (
      <div className='row'>
        <div className='col-md-12'>
          <h4>Services</h4>
          <table className='table table-striped table-condensed'>
            <thead>
              <tr>
                <th>Instance ID</th>
                <th>Organization ID</th>
                <th>Name</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {
                docks.map((d) => (
                  <tr key={ d.id }>
                    <th scope='row'>{ d.instanceId }</th>
                    <td>{ d.org }</td>
                    <td>{ d.ami }</td>
                    <td>{ d.privateIP }</td>
                  </tr>
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
  Docks,
  {
    initialVariables: {
      environment: 'null'
    },

    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          docks {
            id
            ami
            instanceId
            org
            privateIP
          }
        }
      `
    }
  }
)
