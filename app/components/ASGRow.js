import React from 'react'
import Relay from 'react-relay'

import ASGScaleMutation from '../mutations/ASGScale'
import DisableModal from './DisableModal'

class ASGRow extends React.Component {
  static propTypes = {
    asg: React.PropTypes.object
  }

  _changeASG = (value) => {
    Relay.Store.commitUpdate(
      new ASGScaleMutation({
        asg: this.props.asg,
        amount: value
      })
    )
  }

  _increaseASG = () => {
    this._changeASG(1)
  }

  _decreaseASG = () => {
    this._changeASG(-1)
  }

  _disableASG = () => {
    this._changeASG(-1 * this.props.asg.desiredSize)
    this.setState({ open: false })
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
    let avgStateCode = totalStateCode / asg.instanceCount
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
          <DisableModal
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
