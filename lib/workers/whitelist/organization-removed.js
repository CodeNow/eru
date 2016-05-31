import loadenv from 'loadenv'
loadenv({})

import find from '101/find'
import isObject from '101/is-object'
import isString from '101/is-string'
import Promise from 'bluebird'
import WorkerStopError from 'error-cat/errors/worker-stop-error'

import AWS from '../../../data/aws'
import { appClientFactory } from '../../../data/github'

/**
 * When an organization is removed from the whitelist, we want to turn off their
 * ASG.
 * @param {Object} job Job information.
 * @param {Object} job.organizationName Organization GitHub Name.
 * @return {Promise} Resolves when ASG is created.
 */
export default (job) => {
  return Promise.try(() => {
    if (!isObject(job)) {
      throw new WorkerStopError('job must be an object.')
    }
    if (!isString(job.organizationName)) {
      throw new WorkerStopError('job.organizationName must be a string.')
    }
  })
    // this is the slightly longer way, but let's get all the ASGs to make sure
    // one actually exists.
    .then(() => (
      Promise.props({
        asgs: AWS.listASGs(),
        githubInfo: Promise.try(() => {
          const github = appClientFactory()
          return Promise.fromCallback((cb) => {
            github.orgs.get({ org: job.organizationName }, cb)
          })
        })
      })
    ))
    .then(({ asgs, githubInfo: { id: organizationID } }) => {
      const nameRegex = new RegExp(`.+-${organizationID}`)
      const asg = find(asgs, (a) => (nameRegex.test(a.AutoScalingGroupName)))
      if (!asg) {
        throw new WorkerStopError('ASG for organization does not exist.')
      }
      if (asg.DesiredCapacity === 0) {
        throw new WorkerStopError('ASG desired capacity is already at 0.')
      }
      return asg
    })
    .then((asg) => (
      AWS.updateASG(asg, { desiredSize: 0, maxSize: 0, minSize: 0 })
    ))
}
