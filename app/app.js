import { browserHistory } from 'react-router'
import { RelayRouter } from 'react-router-relay'
import { render } from 'react-dom'
import React from 'react'

import routes from './routes'

render(
  <RelayRouter
    history={ browserHistory }
    routes={ routes }
  />,
  document.getElementById('root')
)
