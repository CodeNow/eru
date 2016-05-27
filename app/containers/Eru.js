import envIs from '101/env-is'
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
    // make navbar read if we are looking at production
    const navbarStyle = {}
    let navbarClasses = 'navbar navbar-inverse navbar-fixed-top'
    if (process.env.NODE_ENV === 'production') {
      navbarStyle.backgroundColor = '#d9534f'
      navbarClasses = 'navbar navbar-fixed-top'
    }
    return (
      <div>
        <nav
          className={navbarClasses}
          style={navbarStyle}
        >
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
            <ul className='nav navbar-nav navbar-right'>
              <li>
                <Link to='/app'>Environment: {process.env.NODE_ENV}</Link>
              </li>
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
