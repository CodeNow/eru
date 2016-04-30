import { Link } from 'react-router'
import React from 'react'

export default class NavLink extends Link {
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
