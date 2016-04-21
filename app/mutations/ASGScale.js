import Relay from 'react-relay'

class ASGScale extends Relay.Mutation {
  getMutation () {
    return Relay.QL`mutation { ASGScale }`
  }
  getVariables () {
    return {
      name: this.props.asg.name,
      desiredSize: this.props.asg.desiredSize + this.props.amount,
      minSize: this.props.asg.minSize + this.props.amount,
      maxSize: this.props.asg.maxSize + this.props.amount
    }
  }
  getFatQuery () {
    return Relay.QL`
      fragment on ASGScalePayload {
        asg {
          desiredSize
          minSize
          maxSize
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
        minSize
        maxSize
      }
    `
  };
}

export default ASGScale
