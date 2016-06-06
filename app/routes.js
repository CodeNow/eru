import { IndexRoute, Route } from 'react-router'
import React from 'react'

import AWS from './components/AWS'
import Eru from './components/Eru'
import EruHomeQuery from './queries/EruHomeQuery'
import Loading from './components/Loading'
import Services from './components/Services'
import Users from './components/Users'
import Org from './components/Org'
import Welcome from './components/Welcome'

export default (
  <Route
    path='/app'
    component={Eru}
    queries={EruHomeQuery}
  >
    <IndexRoute
      component={Welcome}
      render={({ props }) => (props ? <Welcome {...props} /> : <Loading />)}
    />
    <Route
      path='aws'
      component={AWS}
      queries={EruHomeQuery}
      render={({ props }) => (props ? <AWS {...props} /> : <Loading />)}
    />
    <Route
      path='services'
      component={Services}
      queries={EruHomeQuery}
      render={({ props }) => (props ? <Services {...props} /> : <Loading />)}
    />
    <Route
      path='users'
      component={Users}
      queries={EruHomeQuery}
      render={({ props }) => (props ? <Users {...props} /> : <Loading />)}
    />
    <Route 
      path="org/:orgname" 
      component={Org}
      queries={EruHomeQuery}
      render={({ props }) => (props ? <Org {...props} /> : <Loading />)}
    />
  </Route>
)
