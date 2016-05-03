import React from 'react'
import Relay from 'react-relay'

import WhitelistAddMutation from '../mutations/WhitelistAdd'

class WhitelistAddForm extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object.isRequired
  }

  handleInputChange = (e) => {
    this.setState({ newOrganization: e.target.value })
  }

  handleSubmit = (e) => {
    e.preventDefault()
    Relay.Store.commitUpdate(
      new WhitelistAddMutation({
        allowed: true,
        name: this.state.newOrganization,
        runnable: this.props.runnable
      })
    )
  }

  render () {
    return (
      <form onSubmit={this.handleSubmit}>
        <div className='form-group'>
          <label htmlFor='newOrganization'>Organization</label>
          <input
            id='newOrganization'
            type='text'
            className='form-control'
            onChange={this.handleInputChange}
          />
        </div>
        <button disabled type='submit' className='btn btn-success'>Add</button>
        <p>Adding will be enabled soon. One more task...</p>
      </form>
    )
  }
}

export default Relay.createContainer(
  WhitelistAddForm,
  {
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          ${WhitelistAddMutation.getFragment('runnable')}
        }
      `
    }
  }
)
