import Relay from 'react-relay'

class WhitelistAddMutation extends Relay.Mutation {
  getMutation () {
    return Relay.QL`mutation { WhitelistAdd }`
  }
  getVariables () {
    return {
      name: this.props.name,
      allowed: !!this.props.allowed
    }
  }
  getFatQuery () {
    return Relay.QL`
      fragment on WhitelistAddPayload {
        runnable { orgs }
        newOrgEdge
      }
    `
  }
  getConfigs () {
    return [{
      type: 'RANGE_ADD',
      parentName: 'runnable',
      parentID: this.props.runnable.id,
      connectionName: 'orgs',
      edgeName: 'newOrgEdge',
      rangeBehaviors: {
        '': 'refetch'
      }
    }]
  }
  static fragments = {
    runnable: () => Relay.QL`
      fragment on Runnable {
        id
      }
    `
  };
}

export default WhitelistAddMutation
