import { applyRouterMiddleware, browserHistory, Router } from 'react-router'
import { render } from 'react-dom'
import Promise from 'bluebird'
import React from 'react'
import Relay from 'react-relay'
import useRelay from 'react-router-relay'

import routes from './routes'
import ErrorStore from './error-store'

class MyNetworkLayer extends Relay.DefaultNetworkLayer {
  sendQueries (queryRequests) {
    return Promise.all(queryRequests.map((request) => {
      return this._sendQuery(request)
        .then((result) => (result.json()))
        .then((payload) => {
          if (payload.hasOwnProperty('errors')) {
            const error = new Error(
              'Server request for query `' + request.getDebugName() + '` ' +
              'failed for the following reasons:\n\n' +
              payload.errors
            )
            error.source = payload
            ErrorStore.setError(formatRequestErrors(request, payload.errors))
            request.reject(error)
          } else if (!payload.hasOwnProperty('data')) {
            request.reject(new Error(
              'Server response was missing for query `' + request.getDebugName() +
              '`.'
            ))
          } else {
            request.resolve({response: payload.data})
          }
        })
        .catch((error) => {
          request.reject(error)
        })
    }))
  }
}

function formatRequestErrors (request, errors) {
  const CONTEXT_BEFORE = 20
  const CONTEXT_LENGTH = 60

  const queryLines = request.getQueryString().split('\n')
  return errors.map(({ locations, message }, ii) => {
    const prefix = (ii + 1) + '. '
    const indent = ' '.repeat(prefix.length)

    // custom errors thrown in graphql-server may not have locations
    const locationMessage = locations
      ? ('\n' + locations.map(({ column, line }) => {
        const queryLine = queryLines[line - 1]
        const offset = Math.min(column - 1, CONTEXT_BEFORE)
        return [
          queryLine.substr(column - 1 - offset, CONTEXT_LENGTH),
          ' '.repeat(Math.max(0, offset)) + '^^^'
        ].map(messageLine => indent + messageLine).join('\n')
      }).join('\n'))
      : ''

    return prefix + message + locationMessage
  }).join('\n')
}

Relay.injectNetworkLayer(new MyNetworkLayer('/graphql'))

render(
  <Router
    history={browserHistory}
    render={applyRouterMiddleware(useRelay)}
    environment={Relay.Store}
    routes={routes}
  />,
  document.getElementById('root')
)
