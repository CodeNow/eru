import Relay from 'react-relay'

class ASGScale extends Relay.Mutation {
  getMutation () {
    return Relay.QL`mutation { ASGScale }`
  }
  getVariables () {
    return {
      name: this.props.asg.name,
      desiredSize: this.props.asg.desiredSize + this.props.amount
    }
  }
  getFatQuery () {
    return Relay.QL`
      fragment on ASGScalePayload {
        asg {
          desiredSize
          instanceCount
        }
      }
    `
  }
  getConfigs () {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        asg: this.props.asg.id
      }
    }]
  }
  static fragments = {
    asg: () => Relay.QL`
      fragment on AutoScaleGroup {
        id
        name
        desiredSize
      }
    `
  };
}

export default ASGScale
