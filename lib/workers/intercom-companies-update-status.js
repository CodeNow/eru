import loadenv from 'loadenv'
loadenv({})

import isBoolean from '101/is-boolean'
import isObject from '101/is-object'
import isString from '101/is-string'
import Promise from 'bluebird'
import WorkerStopError from 'error-cat/errors/worker-stop-error'

import Runnable from '../../data/runnable'

export default (job) => {
  return Promise.try(() => {
    if (!isObject(job)) {
      throw new WorkerStopError('job must be an object')
    }
    if (!isString(job.company)) {
      throw new WorkerStopError('job.company must be a string')
    }
    if (!isBoolean(job.isActive)) {
      throw new WorkerStopError('job.isActive must be a boolean')
    }
  })
    // .then(() => (
    //   Runnable.updateOrgInWhitelist(job.company, job.isActive)
    // ))
}
