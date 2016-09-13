import loadenv from 'loadenv'
loadenv({})

import _ from 'lodash'
import find from '101/find'
import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'
import WorkerStopError from 'error-cat/errors/worker-stop-error'

import AWS from '../../data/aws'
import Runnable from '../../data/runnable'
import promiseWhile from '../utils/promise-while'

export default (job) => {
  return Promise.props({
    asgs: AWS.listASGs(),
    orgs: getInactiveOrgs()
  })
    .then(({ asgs, orgs } ) => {
      // Filter all non-empty ASG IDs
      let activeAsgOrgIds = asgs
        .filter((asg) => (asg.desired > 0))
        .map((asg) => (parseInt(asg.org)))
      // Filter only IDs for array intersection
      let inactiveOrgIds = orgs
        .map((org) => (org.githubId))
      return { activeAsgOrgIds, inactiveOrgIds, orgs }
    })
    .then(({inactiveOrgIds, activeAsgOrgIds, orgs}) => {
      let shouldBeInactive =  _.intersection(inactiveOrgIds, activeAsgOrgIds)
      let toMakeInactive = orgs
        .filter((org) => (shouldBeInactive.indexOf(org.githubId) !== -1))
        .map((org) => (org.lowerName))
      return Promise.using(getRabbitMQClient(), (rabbitmq) => (
        Promise.all([
          Promise.each(toMakeInactive, (company) => (
            rabbitmq.publishToExchange(
              'eru.whitelist.organization.removed',
              '',
              { organizationName:company }
            )
          ))
        ])
      ))
        .return({ toMakeInactive })
    })
}

function getInactiveOrgs () {
  return Runnable.getWhitelistedOrgs()
    .then((orgs) => {
      return orgs
        .filter((org) => (!org.allowed))
        .map((org) => {
          return { org.githubId, org.lowerName }
        }
    })
}

function getRabbitMQClient () {
  const client = new RabbitMQ({})
  return client.connect()
    .return(client)
    .disposer((c) => (c.disconnect()))
}
