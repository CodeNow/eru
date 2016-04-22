import loadenv from 'loadenv'
loadenv()

import assign from '101/assign'
import AWS from 'aws-sdk'
import find from '101/find'
import Promise from 'bluebird'

import { appClientFactory } from './github'
import promiseWhile from '../lib/utils/promise-while'

const {
  AWS_ACCESS_KEY,
  AWS_ENVIRONMENT,
  AWS_REGION,
  AWS_SECRET_KEY
} = process.env

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: AWS_REGION
})

const ec2 = new AWS.EC2()
const asg = new AWS.AutoScaling()

const FILTER_PARAMS = {
  Filters: [
    { Name: 'tag:role', Values: ['dock'] },
    {
      Name: 'instance.group-name',
      Values: [ `${AWS_ENVIRONMENT.toLowerCase()}-dock` ]
    }
  ]
}

class AWSClass {
  static listDocks () {
    return Promise.resolve({ instances: [] })
      .then(promiseWhile(
        (data) => (data.done),
        (data) => {
          const opts = assign({}, FILTER_PARAMS)
          if (data.NextToken) { opts.NextToken = data.NextToken }
          return Promise.fromCallback((cb) => {
            ec2.describeInstances(opts, cb)
          })
            .then((awsData) => {
              awsData.Reservations.forEach((r) => {
                r.Instances.forEach((i) => {
                  data.instances.push(i)
                })
              })
              data.NextToken = awsData.NextToken
              data.done = !awsData.NextToken
              return data
            })
        }
      ))
      .then((data) => (data.instances))
  }

  static getInstances (instanceIDs) {
    if (!instanceIDs || instanceIDs.length === 0) {
      return []
    }
    return Promise.fromCallback((cb) => {
      ec2.describeInstances({ InstanceIds: instanceIDs }, cb)
    })
      .then((instances) => {
        return instances.Reservations.reduce((memo, curr) => {
          Array.prototype.push.apply(memo, curr.Instances)
          return memo
        }, [])
      })
  }

  static _getGithubOrgForASGs (groups) {
    const github = appClientFactory()
    return Promise.map(groups, (g) => {
      return Promise.fromCallback((cb) => {
        github.users.getById({ id: g.org }, cb)
      })
        .then((githubInfo) => {
          return {
            githubOrganization: githubInfo.login,
            ...g
          }
        })
        .catch(() => {
          console.error(`looking for org ${g.org} and did not find it`)
          return g
        })
    })
      .then((groups) => {
        return groups.filter((g) => (g.githubOrganization))
      })
  }

  static _filterAndFormatASGs (groups) {
    return Promise.try(() => {
      return groups.filter((g) => {
        if (!find(g.Tags, (t) => (t.Key === 'org'))) { return false }
        if (!find(g.Tags, (t) => (t.Key === 'env'))) { return false }
        return true
      })
        .map((g) => ({
          org: find(g.Tags, (t) => (t.Key === 'org')).Value,
          env: find(g.Tags, (t) => (t.Key === 'env')).Value,
          ...g
        }))
        .filter((g) => (g.env === `production-${AWS_ENVIRONMENT}`))
    })
      .then(AWSClass._getGithubOrgForASGs)
      .then((groups) => {
        return groups.sort((a, b) => {
          if (a.githubOrganization < b.githubOrganization) { return -1 }
          if (a.githubOrganization > b.githubOrganization) { return 1 }
          return 0
        })
      })
  }

  static listASGs () {
    return Promise.resolve({ asgs: [] })
      .then(promiseWhile(
        (data) => (data.done),
        (data) => {
          const opts = {}
          if (data.NextToken) { opts.NextToken = data.NextToken }
          return Promise.fromCallback((cb) => {
            asg.describeAutoScalingGroups(opts, cb)
          })
            .then((awsData) => {
              Array.prototype.push.apply(data.asgs, awsData.AutoScalingGroups)
              data.NextToken = awsData.NextToken
              data.done = !awsData.NextToken
              return data
            })
        }
      ))
      .then((data) => (data.asgs))
      .then(AWSClass._filterAndFormatASGs)
  }

  static getASGByName (name) {
    const query = {
      AutoScalingGroupNames: [ name ]
    }
    return Promise.fromCallback((cb) => {
      asg.describeAutoScalingGroups(query, cb)
    })
      .then((asgs) => {
        if (!asgs || !asgs.AutoScalingGroups) {
          throw new Error('No ASG found by that name.')
        }
        return asgs.AutoScalingGroups
      })
      .then(AWSClass._filterAndFormatASGs)
      .then((asgs) => (asgs.shift()))
  }

  static updateASG (asgToUpdate, { desiredSize, minSize, maxSize }) {
    const update = {
      AutoScalingGroupName: asgToUpdate.AutoScalingGroupName
    }
    update.MaxSize = Math.max(0, maxSize)
    update.MinSize = Math.max(0, minSize)
    update.DesiredCapacity = Math.max(update.MinSize, desiredSize)
    return Promise.fromCallback((cb) => {
      asg.updateAutoScalingGroup(update, cb)
    })
  }
}

export default AWSClass
