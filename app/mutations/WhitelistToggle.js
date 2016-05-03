import Relay from 'react-relay'

class WhitelistToggleMutation extends Relay.Mutation {
  getMutation () {
    return Relay.QL`mutation { WhitelistToggle }`
  }
  getVariables () {
    return {
      name: this.props.org.githubName,
      allowed: !!this.props.allowed
    }
  }
  getFatQuery () {
    return Relay.QL`
      fragment on WhitelistTogglePayload {
        org {
          allowed
        }
      }
    `
  }
  getConfigs () {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        org: this.props.org.id
      }
    }]
  }
  static fragments = {
    org: () => Relay.QL`
      fragment on Organization {
        id
        allowed
        githubName
      }
    `
  };
}

export default WhitelistToggleMutation
