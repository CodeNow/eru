import { applyRouterMiddleware, browserHistory, Router } from 'react-router'
import useRelay from 'react-router-relay'
import { render } from 'react-dom'
import React from 'react'

import routes from './routes'

render(
  <Router
    history={browserHistory}
    render={applyRouterMiddleware(useRelay)}
    routes={routes}
  />,
  document.getElementById('root')
)
