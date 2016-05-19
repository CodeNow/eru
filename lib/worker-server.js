import loadenv from 'loadenv'
loadenv({})

import { Server } from 'ponos'

import intercomCompaniesFetch from './workers/intercom-companies-fetch'
import intercomCompaniesUpdateStatus from './workers/intercom-companies-update-status'

export default new Server({
  name: 'eru',
  tasks: {
    'eru.intercom.companies.fetch': intercomCompaniesFetch,
    'eru.intercom.companies.update-status': intercomCompaniesUpdateStatus
  }
})
