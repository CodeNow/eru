import React from 'react'
import Relay from 'react-relay'

import ASGScaleInMutation from '../mutations/ASGScaleIn'
import ASGScaleMutation from '../mutations/ASGScale'
import MemoryGraph from './MemoryGraph'
import Modal from './Modal'

class DisableASGModalBody extends React.Component {
  static propTypes = {
    organizationName: React.PropTypes.string.isRequired
  }

  render () {
    return (
      <p>
        Please confirm you would like to disable the organization {this.props.organizationName}.
      </p>
    )
  }
}

class ASGRow extends React.Component {
  static propTypes = {
    alertMessage: React.PropTypes.func.isRequired,
    asg: React.PropTypes.object
  }

  _alertError = (prefix) => {
    return (transaction) => {
      const error = transaction.getError() || new Error('Mutation Failed')
      console.error(error)
      if (error.source && Array.isArray(error.source.errors)) {
        error.source.errors.forEach((e) => {
          this.props.alertMessage({
            level: 'error',
            message: `${prefix} ${e.message}`
          })
        })
      } else {
        this.props.alertMessage({
          level: 'error',
          message: `${prefix} ${error.message}`
        })
      }
    }
  }

  _alertSuccess = (message) => {
    return () => {
      this.props.alertMessage({
        level: 'success',
        message
      })
    }
  }

  _changeASG = (value) => {
    Relay.Store.commitUpdate(
      new ASGScaleMutation({
        asg: this.props.asg,
        amount: value
      }),
      {
        onFailure: this._alertError('Failed to change ASG:'),
        onSuccess: this._alertSuccess(
          `Changed ASG for ${this.props.asg.organizationName} (${this.props.asg.organizationID}) by ${value}`
        )
      }
    )
  }

  _increaseASG = () => {
    this._changeASG(1)
  }

  _decreaseASG = () => {
    Relay.Store.commitUpdate(
      new ASGScaleInMutation({
        asg: this.props.asg,
        amount: -1
      }),
      {
        onFailure: this._alertError('Failed to scale-in ASG:'),
        onSuccess: this._alertSuccess(
          `Scaled-in ASG for ${this.props.asg.organizationName} (${this.props.asg.organizationID}) by -1`
        )
      }
    )
  }

  _disableASG = () => {
    this._changeASG(-1 * this.props.asg.desiredSize)
    this._closeModal()
  }

  _openModal = () => {
    this.setState({ open: true })
  }

  _closeModal = () => {
    this.setState({ open: false })
  }

  render () {
    const { asg } = this.props
    const totalStateCode = asg.instances.reduce((t, c) => (t + c.stateCode), 0)
    const avgStateCode = totalStateCode / asg.instanceCount
    const missingInstances = asg.desiredSize !== asg.instanceCount
    const notAllRunning = asg.instanceCount > 0 && avgStateCode !== 16
    const className = notAllRunning || missingInstances ? 'info' : ''
    return (
      <tr className={className}>
        <th scope='row'>{`${asg.organizationName} (${asg.organizationID})`}</th>
        <td>{asg.name}</td>
        <td>{asg.launchConfiguration}</td>
        <td>{asg.created}</td>
        <td>{asg.desiredSize}</td>
        <td>{asg.instanceCount}</td>
        <td>
          <MemoryGraph asg={asg} />
        </td>
        <td>
          <button
            className='btn btn-success'
            onClick={this._increaseASG}
          >
            Bigger!
          </button>
          <button
            className='btn btn-info'
            disabled={asg.desiredSize === 0}
            onClick={this._decreaseASG}
          >
            Smaller!
          </button>
          <button
            className='btn btn-warning'
            disabled={asg.desiredSize === 0}
            onClick={this._openModal}
          >
            Disable!
          </button>
          <Modal
            title='Confirm Disable'
            body={<DisableASGModalBody organizationName={this.props.asg.organizationName} />}
            confirmPrompt='Yup, Disable It!'
            closeModal={this._closeModal}
            confirmSuccess={this._disableASG}
            open={this.state && this.state.open}
          />
        </td>
      </tr>
    )
  }
}

export default Relay.createContainer(
  ASGRow,
  {
    fragments: {
      asg: () => Relay.QL`
        fragment on AutoScaleGroup {
          ${ASGScaleMutation.getFragment('asg')}
          ${ASGScaleInMutation.getFragment('asg')}
          ${MemoryGraph.getFragment('asg')}
          id
          created
          desiredSize
          launchConfiguration
          name
          organizationID
          organizationName
          instanceCount
          instances {
            stateCode
          }
        }
      `
    }
  }
)
