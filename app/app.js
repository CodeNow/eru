import { applyRouterMiddleware, browserHistory, Router } from 'react-router'
import { render } from 'react-dom'
import React from 'react'
import Relay from 'react-relay'
import useRelay from 'react-router-relay'

import routes from './routes'

render(
  <Router
    history={browserHistory}
    render={applyRouterMiddleware(useRelay)}
    environment={Relay.Store}
    routes={routes}
  />,
  document.getElementById('root')
)
