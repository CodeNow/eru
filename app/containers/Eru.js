import React from 'react'
import Relay from 'react-relay'
import { Link } from 'react-router'

class NavLink extends Link {
  static propTypes = {
    children: React.PropTypes.array,
    to: React.PropTypes.string,
    activeStyle: React.PropTypes.string,
    onlyActiveOnIndex: React.PropTypes.bool
  }

  render () {
    const { to, activeStyle, onlyActiveOnIndex, ...props } = this.props
    const { router } = this.context

    if (router) {
      const location = to
      props.href = router.createHref(location)

      if (router.isActive(location, onlyActiveOnIndex)) {
        props.className += 'active'
        if (activeStyle) {
          props.style = { ...props.style, ...activeStyle }
        }
      }
    }

    return (
      <li {...props}>
        <a onClick={this.handleClick}>
          {this.props.children}
        </a>
      </li>
    )
  }
}

class Eru extends React.Component {
  static propTypes = {
    runnable: React.PropTypes.object,
    children: React.PropTypes.object,
    relay: React.PropTypes.object.isRequired
  }

  render () {
    const numDocks = this.props.runnable.docks.length
    const numServices = this.props.runnable.services.length
    const numUsers = this.props.runnable.users.length
    return (
      <div>
        <nav className='navbar navbar-inverse navbar-fixed-top'>
          <div className='container'>
            <div className='navbar-header'>
              <Link to='/app' className='navbar-brand'>Eru</Link>
            </div>
            <ul className='nav navbar-nav'>
              <NavLink to='/app/docks'>
                Docks <span className='badge'>{numDocks}</span>
              </NavLink>
              <NavLink to='/app/services'>
                Services <span className='badge'>{numServices}</span>
              </NavLink>
              <NavLink to='/app/users'>
                Users <span className='badge'>{numUsers}</span>
              </NavLink>
            </ul>
          </div>
        </nav>
        <div className='container'>
          {this.props.children}
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
          docks { id }
          services { id }
          users { id }
        }
      `
    }
  }
)
