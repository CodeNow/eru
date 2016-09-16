import loadenv from 'loadenv'
loadenv({})

import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'

import AWS from '../../data/aws'
import Runnable from '../../data/runnable'

export default (job) => {
  return Promise.props({
    asgs: getASGs(),
    orgs: getOrgs()
  })
    .then(({asgs, orgs}) => {
      let toMakeActive = orgs.active
        .filter((org) => {
          return asgs.inactive.indexOf(org) !== -1
        })
      let toMakeInactive = orgs.inactive
        .filter((org) => {
          return asgs.active.indexOf(org) !== -1
        })
      return {toMakeActive, toMakeInactive}
    })
    .then(({toMakeActive, toMakeInactive}) => {
      return Promise.using(getRabbitMQClient(), (rabbitmq) => (
        Promise.all([
          Promise.each(toMakeActive, (orgId) => (
            rabbitmq.publishEvent(
              'organization.allowed',
              { githubId: orgId }
            )
          )),
          Promise.each(toMakeInactive, (orgId) => (
            rabbitmq.publishEvent(
              'organization.disallowed',
              { githubId: orgId }
            )
          ))
        ])
      ))
        .return({toMakeActive, toMakeInactive})
    })
}

function getASGs () {
  return AWS.listASGs()
    .then((groups) => {
      const active = groups
        .filter((g) => (g.DesiredCapacity > 0))
        .map((g) => (parseInt(g.org)))
      const inactive = groups
        .filter((g) => (g.DesiredCapacity === 0))
        .map((g) => (parseInt(g.org)))
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