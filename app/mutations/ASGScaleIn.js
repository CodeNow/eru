import Relay from 'react-relay'

class ASGScaleIn extends Relay.Mutation {
  getMutation () {
    return Relay.QL`mutation { ASGScaleIn }`
  }
  getVariables () {
    return {
      name: this.props.asg.name,
      desiredSize: this.props.asg.desiredSize + this.props.amount
    }
  }
  getFatQuery () {
    return Relay.QL`
      fragment on ASGScaleInPayload {
        asg {
          desiredSize
          instanceCount
          instances
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

export default ASGScaleIn
