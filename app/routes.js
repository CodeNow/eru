import React from 'react'
import { Route, IndexRoute } from 'react-router'

import Docks from './components/Docks'
import Eru from './containers/Eru'
import EruHomeQuery from './queries/EruHomeQuery'
import Services from './components/Services'
import Users from './components/Users'
import Welcome from './components/Welcome'

export default (
  <Route
    path='/'
    component={ Eru }
    queries={ EruHomeQuery }
  >
    <IndexRoute
      component={ Welcome }
    />
    <Route
      path='/docks'
      component={ Docks }
      queries={ EruHomeQuery }
    />
    <Route
      path='/services'
      component={ Services }
      queries={ EruHomeQuery }
    />
    <Route
      path='/users'
      component={ Users }
      queries={ EruHomeQuery }
    />
  </Route>
)
