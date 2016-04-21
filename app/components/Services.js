import React from 'react'
import Relay from 'react-relay'

class Services extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object
  }

  render () {
    const { services } = this.props.runnable
    return (
      <div className='row'>
        <div className='col-md-12'>
          <h4>Services</h4>
          <table className='table table-striped table-condensed'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {
                services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.version || 'unknown'}</td>
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
  Services,
  {
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          services {
            id
            name
            version
          }
        }
      `
    }
  }
)
