import { IndexRoute, Route } from 'react-router'
import React from 'react'

import AWS from './components/AWS'
import Eru from './components/Eru'
import EruHomeQuery from './queries/EruHomeQuery'
import Loading from './components/Loading'
import Services from './components/Services'
import Users from './components/Users'
import ModerateOrg from './components/ModerateOrg'
import Welcome from './components/Welcome'

export default (
  <Route
    path='/app'
    component={Eru}
    queries={EruHomeQuery}
    render={({ props, routerProps }) => (
      props ? <Eru {...props} /> : <Loading {...routerProps} />
    )}
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
      path='org/:orgName'
      component={ModerateOrg}
      queries={EruHomeQuery}
      render={({ props, routerProps }) => (
        props ? <ModerateOrg {...props} /> : <Loading {...routerProps} />
      )}
    />
  </Route>
)
