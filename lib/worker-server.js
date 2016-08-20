import loadenv from 'loadenv'
loadenv({})

import { Server } from 'ponos'

import intercomCompaniesFetch from './workers/intercom-companies-fetch'
import intercomCompaniesUpdateStatus from './workers/intercom-companies-update-status'
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
    'eru.intercom.companies.fetch': intercomCompaniesFetch,
    'eru.intercom.companies.update-status': intercomCompaniesUpdateStatus
  },
  events: {
    'eru.whitelist.organization.added': organizationAddedWorker,
    'eru.whitelist.organization.allowed': organizationAllowedWorker,
    'eru.whitelist.organization.disallowed': organizationRemovedWorker,
    'eru.whitelist.organization.removed': organizationRemovedWorker
    // disallowing and removing an org on the whitelist is the same behavior:
    // just set the ASG to 0.
  }
})
