import loadenv from 'loadenv'
loadenv({})

import isNumber from '101/is-number'
import isObject from '101/is-object'
import Promise from 'bluebird'
import WorkerStopError from 'error-cat/errors/worker-stop-error'

import AWS from '../../../data/aws'

/**
 * When an organization is added to the whitelist, we want to create their ASG
 * in AWS.
 * @param {Object} job Job information.
 * @param {String} job.organizationID Organization GitHub ID.
 * @return {Promise} Resolves when ASG is created.
 */
export default (job) => {
  return Promise.try(() => {
    if (!isObject(job)) {
      throw new WorkerStopError('job must be an object')
    }
    if (!isNumber(job.organizationID)) {
      throw new WorkerStopError('job.organizationID must be a number')
    }
  })
    .then(() => (
      AWS.createAWSASGCluster(job.organizationID)
    ))
}
