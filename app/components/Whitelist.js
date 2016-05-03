import React from 'react'
import Relay from 'react-relay'

import WhitelistAddForm from './WhitelistAddForm'
import WhitelistRow from './WhitelistRow'

class Whitelist extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  render () {
    const orgs = this.props.runnable.orgs.edges.map((e) => (e.node))
    return (
      <div className='col-md-6'>
        <h4>User Control</h4>
        <p>
          Enable/disable organizations.
        </p>
        <WhitelistAddForm runnable={this.props.runnable} />
        <hr />
        <table className='table table-striped table-condensed table-hover'>
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Allowed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {
              orgs.map((o) => (
                <WhitelistRow
                  key={o.id}
                  org={o}
                  runnable={this.props.runnable}
                />
              ))
            }
          </tbody>
        </table>
      </div>
    )
  }
}

export default Relay.createContainer(
  Whitelist,
  {
    initialVariables: {
      pageSize: 1000000
    },
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          ${WhitelistAddForm.getFragment('runnable')}
          ${WhitelistRow.getFragment('runnable')}
          orgs(first: $pageSize) {
            edges {
              node {
                id
                ${WhitelistRow.getFragment('org')}
              }
            }
          }
        }
      `
    }
  }
)
