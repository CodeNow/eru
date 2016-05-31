import loadenv from 'loadenv'
loadenv({})

import find from '101/find'
import Intercom from '@runnable/orion'
import Promise from 'bluebird'
import RabbitMQ from 'ponos/lib/rabbitmq'
import WorkerStopError from 'error-cat/errors/worker-stop-error'

import Runnable from '../../data/runnable'
import promiseWhile from '../utils/promise-while'

export default (job) => {
  return Promise.props({
    companyNames: getInactiveCompaniesFromIntercom(),
    orgs: getOrgs()
  })
    .then(({ companyNames: shouldBeInactive, orgs: { active, inactive } }) => {
      // if a company is to be made active, it must be in the "inactive" state
      // currently and _not_ be in the shouldBeInactive list
      const toMakeActive = inactive
        .filter((n) => (shouldBeInactive.indexOf(n) === -1))
      // if a company is to be made inactive, it must be in the "active" state
      // and also in the shouldBeInactive list
      const toMakeInactive = active
        .filter((n) => (shouldBeInactive.indexOf(n) !== -1))
      return Promise.using(getRabbitMQClient(), (rabbitmq) => (
        Promise.all([
          Promise.each(toMakeActive, (company) => (
            rabbitmq.publishToQueue(
              'eru.intercom.companies.update-status',
              { company, isActive: true }
            )
          )),
          Promise.each(toMakeInactive, (company) => (
            rabbitmq.publishToQueue(
              'eru.intercom.companies.update-status',
              { company, isActive: false }
            )
          ))
        ])
      ))
        .return({ toMakeActive, toMakeInactive })
    })
}

function getInactiveCompaniesFromIntercom () {
  return Intercom.tags.list()
    .then(({ tags, pages }) => ({ tags, pages }))
    .then(promiseWhile(
      (data) => (!(data.pages && data.pages.next)),
      (data) => {
        return Intercom.nextPage(data.pages)
          .then(({ tags, pages }) => {
            Array.prototype.push.apply(data.tags, tags)
            data.pages = pages
            return data
          })
      }
    ))
    .then(({ tags }) => {
      const inactive = find(tags, (t) => (t.name.toLowerCase() === 'inactive'))
      if (!inactive) {
        throw new WorkerStopError('Could not find `inactive` tag.')
      }
      return Intercom.companies.listBy({ tag_id: inactive.id })
        .then(({ companies, pages }) => ({ companies, pages }))
        .then(promiseWhile(
          (data) => (!(data.pages && data.pages.next)),
          (data) => {
            return Intercom.nextPage(data.pages)
              .then(({ companies, pages }) => {
                Array.prototype.push.apply(data.companies, companies)
                data.pages = pages
                return data
              })
          }
        ))
    })
    .then(({ companies }) => {
      return companies
        .filter((c) => (!!c.name))
        .map((c) => (c.name.toLowerCase()))
    })
}

function getOrgs () {
  return Runnable.getWhitelistedOrgs()
    .then((orgs) => {
      const active = orgs
        .filter((o) => (!!o.allowed))
        .map((o) => (o.lowerName))
      const inactive = orgs
        .filter((o) => (!o.allowed))
        .map((o) => (o.lowerName))
      return { active, inactive }
    })
}

function getRabbitMQClient () {
  const client = new RabbitMQ({})
  return client.connect()
    .return(client)
    .disposer((c) => (c.disconnect()))
}
