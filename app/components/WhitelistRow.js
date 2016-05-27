import React from 'react'
import Relay from 'react-relay'

import Modal from './Modal'
import WhitelistRemoveMutation from '../mutations/WhitelistRemove'
import WhitelistToggleMutation from '../mutations/WhitelistToggle'

class RemoveModalBody extends React.Component {
  static propTypes = {
    organizationName: React.PropTypes.string.isRequired
  }

  render () {
    return (
      <p>
        Would you like to remove the organization {this.props.organizationName}?
      </p>
    )
  }
}

class WhitelistRow extends React.Component {
  static propTypes = {
    org: React.PropTypes.object.isRequired
  }

  constructor () {
    super()
    this.state = {
      open: false
    }
  }

  _disableOrganization = () => {
    Relay.Store.commitUpdate(
      new WhitelistToggleMutation({
        org: this.props.org,
        allowed: !this.props.org.allowed
      })
    )
  }

  _removeOrganizationFromWhitelist = () => {
    this._removeOrg()
    this._closeModal()
  }

  _removeOrg = () => {
    Relay.Store.commitUpdate(
      new WhitelistRemoveMutation({
        name: this.props.org.githubName,
        runnable: this.props.runnable
      })
    )
  }

  _openModal = () => {
    this.setState({ open: true })
  }

  _closeModal = () => {
    this.setState({ open: false })
  }

  render () {
    const modalBody = <RemoveModalBody
      organizationName={this.props.org.githubName}
    />
    const allowedDisplay = this.props.org.allowed ? 'Enabled' : 'Disabled'
    return (
      <tr key={this.props.org.id}>
        <td>{this.props.org.githubName}</td>
        <td>{allowedDisplay}</td>
        <td>
          <button
            className='btn btn-danger'
            onClick={this._openModal}
          >
            Remove
          </button>
          <Modal
            title='Remove Organization Confirmation'
            body={modalBody}
            confirmPrompt='Yes, Remove'
            closeModal={this._closeModal}
            confirmSuccess={this._removeOrganizationFromWhitelist}
            open={this.state.open}
          />
        </td>
      </tr>
    )
  }
}

export default Relay.createContainer(
  WhitelistRow,
  {
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          ${WhitelistRemoveMutation.getFragment('runnable')}
        }
      `,
      org: () => Relay.QL`
        fragment on Organization {
          ${WhitelistToggleMutation.getFragment('org')}
          id
          allowed
          githubName
        }
      `
    }
  }
)
