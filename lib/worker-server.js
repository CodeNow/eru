import loadenv from 'loadenv'
loadenv({})

import { Server } from 'ponos'

import organizationsSync from './workers/organizations-sync'
import organizationsUpdateStatus from './workers/organizations-update-status'

export default new Server({
  name: 'eru',
  rabbitmq: {
    channel: {
      prefetch: process.env.WORKER_PREFETCH
    }
  },
  tasks: {
    'eru.organizations.sync': organizationsSync,
    'eru.organizations.update-status': organizationsUpdateStatus
  },
  events: {}
})
