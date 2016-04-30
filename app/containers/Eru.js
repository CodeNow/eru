import React from 'react'
import Relay from 'react-relay'
import { Link } from 'react-router'

import Alert from '../components/Alert'
import NavLink from '../components/NavLink'

class Eru extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object,
    children: React.PropTypes.object,
    relay: React.PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)
    this.state = { alertMessages: [] }
  }

  _setAlertMessage = (alertMessage) => {
    const alertMessages = this.state.alertMessages.slice(0)
    alertMessages.push(alertMessage)
    this.setState({ alertMessages })
  }

  _clearAlertMessage = (index) => {
    const alertMessages = this.state.alertMessages.slice(0)
    alertMessages.splice(index, 1)
    this.setState({ alertMessages })
  }

  render () {
    return (
      <div>
        <nav className='navbar navbar-inverse navbar-fixed-top'>
          <div className='container-fluid'>
            <div className='navbar-header'>
              <Link to='/app' className='navbar-brand'>Eru</Link>
            </div>
            <ul className='nav navbar-nav'>
              <NavLink to='/app/aws'>
                Docks <span></span>
              </NavLink>
              <NavLink to='/app/services'>
                Services <span></span>
              </NavLink>
              <NavLink to='/app/users'>
                Users <span></span>
              </NavLink>
            </ul>
          </div>
        </nav>
        <div className='container-fluid'>
          <Alert
            _clearAlertMessage={this._clearAlertMessage}
            alertMessages={this.state.alertMessages}
          />
          {
            React.Children.map(this.props.children, (c) => (
              React.cloneElement(c, { alertMessage: this._setAlertMessage })
            ))
          }
        </div>
      </div>
    )
  }
}

export default Relay.createContainer(
  Eru,
  {
    fragments: {
      runnable: () => Relay.QL`
        fragment on Runnable {
          services { id }
        }
      `
    }
  }
)
