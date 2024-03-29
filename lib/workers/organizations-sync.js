import loadenv from 'loadenv'
loadenv({})

import isNumber from '101/is-number'
import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'

import AWS from '../../data/aws'
import Runnable from '../../data/runnable'

import logger from '../logger'

const log = logger.child({ module: 'organization-sync' })

export default (job) => {
  return Promise.props({
    asgs: getASGs(),
    orgs: getOrgs()
  })
    .then(({asgs, orgs}) => {
      let toMakeActive = orgs.active
        .filter((org) => {
          return asgs.active.indexOf(org) === -1
        })
      let toMakeInactive = orgs.inactive
        .filter((org) => {
          return asgs.active.indexOf(org) !== -1
        })
      return {toMakeActive, toMakeInactive}
    })
    .then(({toMakeActive, toMakeInactive}) => {
      return Promise.using(getRabbitMQClient(), (rabbitmq) => {
        return Promise.each(toMakeInactive, (orgId) => {
          log.info('Disallowing', orgId)
          return Runnable.resetOrgInBigPoppa(orgId)
            .then(() => {
              rabbitmq.publishEvent(
                'organization.disallowed',
                { githubId: orgId.toString() }
              )
            })
        })
      })
        .return({toMakeActive, toMakeInactive})
    })
}

function getASGs () {
  return AWS.listASGs()
    .then((groups) => {
      const active = groups
        .filter((g) => (g.DesiredCapacity > 0))
        .map((g) => (parseInt(g.org)))
        .filter(isNumber)
      const inactive = groups
        .filter((g) => (g.DesiredCapacity === 0))
        .map((g) => (parseInt(g.org)))
        .filter(isNumber)
      return { active, inactive }
    })
}

function getOrgs () {
  return Runnable.getWhitelistedOrgs()
    .then((orgs) => {
      const active = orgs
        .filter((o) => (!!o.allowed))
        .map((o) => (o.githubId))
      const inactive = orgs
        .filter((o) => (!o.allowed))
        .map((o) => (o.githubId))
      return { active, inactive }
    })
}

function getRabbitMQClient () {
  const client = new RabbitMQ({})
  return client.connect()
    .return(client)
    .disposer((c) => (c.disconnect()))
}
