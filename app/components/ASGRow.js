import React from 'react'
import Relay from 'react-relay'
import cubism from 'cubism'
import d3 from 'd3'

import ASGScaleMutation from '../mutations/ASGScale'
import ASGScaleInMutation from '../mutations/ASGScaleIn'
import DisableModal from './DisableModal'

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

  componentDidMount () {
    const data = this.props.asg.reservedMemoryStatistics.map((s) => (s.average / 100))
    console.log(data)
    const container = this.refs['chart-container']
    const context = cubism.context()
      .serverDelay(0)
      .step(5 * 60 * 100)
      .size(48)
      .stop()

    // d3.select(container).selectAll('.axis')
    //     .data(['top', 'bottom'])
    //   .enter().append('div')
    //     .attr('class', function (d) { return d + ' axis' })
    //     .each(function (d) {
    //       d3.select(this).call(context.axis())
    //     })

    // d3.select(container).append('div')
    //   .attr('class', 'rule')
    //   .call(context.rule())

    const metric = context.metric((start, stop, step, cb) => {
      cb(null, data)
    }, '')

    d3.select(container).selectAll('.horizon')
        .data([metric])
      .enter().insert('div', '.bottom')
        .attr('class', 'horizon')
      .call(context.horizon().extent([0, 1]).format(d3.format('.3p')))

    // context.on('focus', function (i) {
    //   console.log(context.size(), i, context.size()-i)
    //   d3.selectAll('.value')
    //     .style('right', i ? context.size() - i + 'px' : null)
    // })
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
        <td style={{maxWidth: '48px'}}>
          <div ref='chart-container'></div>
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
          ${ASGScaleInMutation.getFragment('asg')}
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
          reservedMemoryStatistics {
            timestamp
            average
            unit
          }
        }
      `
    }
  }
)
