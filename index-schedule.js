import loadenv from 'loadenv'
loadenv({})

import schedule from 'node-schedule'
import RabbitMQ from 'ponos/lib/rabbitmq'
import Promise from 'bluebird'

const syncRule = new schedule.RecurrenceRule()
syncRule.minute = [ 0, 15 ]

schedule.scheduleJob(syncRule, () => {
  return Promise.using(getRabbitMQClient(), (rabbit) => (
    rabbit.publishToQueue('eru.organizations.cleanup.removed', {})
  ))
})

function getRabbitMQClient () {
  const r = new RabbitMQ({})
  return r.connect().return(r).disposer(() => (r.disconnect()))
}
