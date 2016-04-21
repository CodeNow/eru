import React from 'react'
import Relay from 'react-relay'

import ASGScaleMutation from '../mutations/ASGScale'

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

  _increaseASG = (e) => {
    this._changeASG(1)
  }

  _decreaseASG = (e) => {
    this._changeASG(-1)
  }

  render () {
    const { asg } = this.props
    return (
      <tr>
        <th scope='row'>{`${asg.organizationName} (${asg.organizationID})`}</th>
        <td>{asg.name}</td>
        <td>{asg.launchConfiguration}</td>
        <td>{asg.created}</td>
        <td>{asg.minSize}</td>
        <td>{asg.maxSize}</td>
        <td>{asg.desiredSize}</td>
        <td>
          <button
            className='btn btn-success'
            onClick={this._increaseASG}
          >
            Bigger!
          </button>
          <button
            className='btn btn-info'
            disabled={asg.minSize === 0 && asg.desiredSize === 0}
            onClick={this._decreaseASG}
          >
            Smaller!
          </button>
          <button disabled className='btn btn-warning'>Disable!</button>
          <button disabled className='btn btn-danger'>Destroy!</button>
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
          maxSize
          minSize
          name
          organizationID
          organizationName
        }
      `
    }
  }
)
