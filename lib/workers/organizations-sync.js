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
          return asgs.active.indexOf(org.id) === -1
        })
        .map((org) => (org.lowerName))
      let toMakeInactive = orgs.inactive
        .filter((org) => {
          return asgs.inactive.indexOf(org.id) === -1
        })
        .map((org) => (org.lowerName))
      return {toMakeActive, toMakeInactive}
    })
    .then(({toMakeActive, toMakeInactive}) => {
      return Promise.using(getRabbitMQClient(), (rabbitmq) => (
        Promise.all([
          Promise.each(toMakeActive, (company) => (
            rabbitmq.publishToExchange(
              'whitelist.organization.allowed',
              '',
              { organizationName: company }
            )
          )),
          Promise.each(toMakeInactive, (company) => (
            rabbitmq.publishToExchange(
              'whitelist.organization.removed',
              '',
              { organizationName: company }
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
        .map((g) => (g.org))
      const inactive = groups
        .filter((g) => (g.DesiredCapacity === 0))
        .map((g) => (g.org))
      return { active, inactive }
    })
}

function getOrgs () {
  return Runnable.getWhitelistedOrgs()
    .then((orgs) => {
      const active = orgs
        .filter((o) => (!!o.allowed))
        .map((o) => {
          return { githubId: o.githubId, lowerName: o.lowerName }
        })
      const inactive = orgs
        .filter((o) => (!o.allowed))
        .map((o) => {
          return { githubId: o.githubId, lowerName: o.lowerName }
        })
      return { active, inactive }
    })
}

function getRabbitMQClient () {
  const client = new RabbitMQ({})
  return client.connect()
    .return(client)
    .disposer((c) => (c.disconnect()))
}
