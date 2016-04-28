import { IndexRoute, Route } from 'react-router'
import React from 'react'

import AWS from './components/AWS'
import Eru from './containers/Eru'
import EruHomeQuery from './queries/EruHomeQuery'
import Services from './components/Services'
import Users from './components/Users'
import Welcome from './components/Welcome'

export default (
  <Route
    path='/app'
    component={Eru}
    queries={EruHomeQuery}
  >
    <IndexRoute
      component={Welcome}
    />
    <Route
      path='aws'
      component={AWS}
      queries={EruHomeQuery}
    />
    <Route
      path='services'
      component={Services}
      queries={EruHomeQuery}
    />
    <Route
      path='users'
      component={Users}
      queries={EruHomeQuery}
    />
  </Route>
)
