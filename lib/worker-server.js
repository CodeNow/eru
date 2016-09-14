import loadenv from 'loadenv'
loadenv({})

import { Server } from 'ponos'

import organizationsSync from './workers/organizations-sync'
import organizationsUpdateStatus from './workers/organizations-update-status'
import organizationAddedWorker from './workers/whitelist/organization-added'
import organizationAllowedWorker from './workers/whitelist/organization-allowed'
import organizationRemovedWorker from './workers/whitelist/organization-removed'

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
  events: {
    'whitelist.organization.added': organizationAddedWorker,
    'whitelist.organization.allowed': organizationAllowedWorker,
    // disallowing and removing an org on the whitelist is the same behavior:
    // just set the ASG to 0.
    'whitelist.organization.disallowed': organizationRemovedWorker,
    'whitelist.organization.removed': organizationRemovedWorker
  }
})
