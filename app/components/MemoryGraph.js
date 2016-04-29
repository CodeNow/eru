import React from 'react'
import Relay from 'react-relay'
import cubism from 'cubism'
import d3 from 'd3'

class MemoryGraph extends React.Component {
  static propTypes = {
    asg: React.PropTypes.object.isRequired
  }

  componentDidMount () {
    const data = this.props.asg.reservedMemoryStatistics.map((s) => (s.average / 100))
    const container = this.refs['chart-container']
    const context = cubism.context()
      .serverDelay(0)
      .step(5 * 60 * 100)
      .size(48)
      .stop()

    const metric = context.metric((start, stop, step, cb) => {
      cb(null, data)
    }, '')

    d3.select(container).selectAll('.horizon')
        .data([metric])
      .enter().insert('div', '.bottom')
        .attr('class', 'horizon')
      .call(context.horizon().extent([0, 1]).format(d3.format('.3p')))
  }

  render () {
    return (
      <div ref='chart-container'></div>
    )
  }
}

export default Relay.createContainer(
  MemoryGraph,
  {
    fragments: {
      asg: () => Relay.QL`
        fragment on AutoScaleGroup {
          name
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
