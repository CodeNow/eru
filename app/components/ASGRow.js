import React from 'react'
import Relay from 'react-relay'

import ASGScaleInMutation from '../mutations/ASGScaleIn'
import ASGScaleMutation from '../mutations/ASGScale'
import MemoryGraph from './MemoryGraph'

class ASGRow extends React.Component {
  static propTypes = {
    alertMessage: React.PropTypes.func.isRequired,
    asg: React.PropTypes.object.isRequired
  }

  _alertErrorWithPrefix = (prefix) => {
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

  _alertSuccessWithMessage = (message) => {
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
        onFailure: this._alertErrorWithPrefix('Failed to change ASG:'),
        onSuccess: this._alertSuccessWithMessage(
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
        onFailure: this._alertErrorWithPrefix('Failed to scale-in ASG:'),
        onSuccess: this._alertSuccessWithMessage(
          `Scaled-in ASG for ${this.props.asg.organizationName} (${this.props.asg.organizationID}) by -1`
        )
      }
    )
  }

  render () {
    const { asg } = this.props
    const missingInstances = asg.desiredSize !== asg.instanceCount
    const className = missingInstances ? 'info' : ''
    return (
      <tr className={className}>
        <th scope='row'>{`${asg.organizationName} (${asg.organizationID})`}</th>
        <td>{asg.launchConfiguration}</td>
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
            disabled={asg.desiredSize <= 1}
            onClick={this._decreaseASG}
          >
            Smaller!
          </button>
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
        }
      `
    }
  }
)
