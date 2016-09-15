import loadenv from 'loadenv'
loadenv({})

import find from '101/find'
import isObject from '101/is-object'
import isNumber from '101/is-number'
import Promise from 'bluebird'
import WorkerStopError from 'error-cat/errors/worker-stop-error'

import AWS from '../../../data/aws'

/**
 * When an organization is removed from the whitelist, we want to turn off their
 * ASG.
 * @param {Object} job Job information.
 * @param {String} job.organizationName Organization GitHub Name.
 * @return {Promise} Resolves when ASG is created.
 */
export default (job) => {
  return Promise.try(() => {
    if (!isObject(job)) {
      throw new WorkerStopError('job must be an object.')
    }
    if (!isNumber(job.githubId)) {
      throw new WorkerStopError('job.githubId must be a number')
    }
  })
    // this is the slightly longer way, but let's get all the ASGs to make sure
    // one actually exists.
    .then(() => (
      Promise.props({
        asgs: AWS.listASGs(),
        githubId: job.githubId
      })
    ))
    .then(({ asgs, githubId }) => {
      const nameRegex = new RegExp(`.+-${githubId}`)
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
