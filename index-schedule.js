import loadenv from 'loadenv'
loadenv({})

import schedule from 'node-schedule'
import RabbitMQ from 'ponos/lib/rabbitmq'
import Promise from 'bluebird'

const intercomSyncRule = new schedule.RecurrenceRule()
intercomSyncRule.minute = [ 0, 30 ]

schedule.scheduleJob(intercomSyncRule, () => {
  return Promise.using(getRabbitMQClient(), (rabbit) => (
    rabbit.publishToQueue('eru.intercom.companies.fetch', {})
  ))
})

function getRabbitMQClient () {
  const r = new RabbitMQ({})
  return r.connect().return(r).disposer(() => (r.disconnect()))
}
