import Relay from 'react-relay'

class WhitelistRemoveMutation extends Relay.Mutation {
  getMutation () {
    return Relay.QL`mutation { WhitelistRemove }`
  }
  getVariables () {
    return {
      name: this.props.name
    }
  }
  getFatQuery () {
    return Relay.QL`
      fragment on WhitelistRemovePayload {
        runnable { orgs }
        removedOrgIDs
      }
    `
  }
  getConfigs () {
    return [{
      type: 'RANGE_DELETE',
      parentName: 'runnable',
      parentID: this.props.runnable.id,
      connectionName: 'orgs',
      pathToConnection: [ 'runnable', 'orgs' ],
      deletedIDFieldName: 'removedOrgIDs'
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

export default WhitelistRemoveMutation
