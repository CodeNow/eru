import loadenv from 'loadenv'
loadenv()

import assign from '101/assign'
import AWS from 'aws-sdk'
import exists from '101/exists'
import find from '101/find'
import moment from 'moment'
import Promise from 'bluebird'

import { appClientFactory, tokenClientFactory } from './github'
import cacheLayer from './cache-layer'
import promiseWhile from '../lib/utils/promise-while'
import RabbitMQ from '../lib/models/rabbitmq'
import logger from '../lib/logger'

const log = logger.child({
  module: 'data/aws',
  model: 'AWSClass'
})

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

const asg = new AWS.AutoScaling()
const cloudwatch = new AWS.CloudWatch()
const ec2 = new AWS.EC2()

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

  static _getGithubOrgForASGs (groups, queryUser) {
    const _log = log.child({ method: '_getGithubOrgForASGs' })
    const github = queryUser && queryUser.accessToken
      ? tokenClientFactory(queryUser.accessToken)
      : appClientFactory()
    return Promise.map(groups, (g) => {
      return github.runThroughCache('users.getById', { id: g.org })
        .then((githubInfo) => {
          return {
            githubOrganization: githubInfo.login,
            ...g
          }
        })
        .catch((err) => {
          _log.error({ err }, `looking for org ${g.org} and did not find it`)
          return g
        })
    })
      .then((groups) => {
        return groups.filter((g) => (g.githubOrganization))
      })
  }

  static _formatASGs (groups, queryUser) {
    return Promise.try(() => {
      return groups.map((g) => ({
        org: find(g.Tags, (t) => (t.Key === 'org')).Value,
        env: find(g.Tags, (t) => (t.Key === 'env')).Value,
        ...g
      }))
    })
  }

  static getASGNamesForEnvironment () {
    return cacheLayer.runAgainstCache(
      'aws-asg-names-for-environment',
      () => {
        return Promise.resolve({ data: [] })
          .then(promiseWhile(
            (data) => (data.done),
            (data) => {
              const opts = {
                Filters: [
                  {
                    Name: 'key',
                    Values: ['env']
                  }, {
                    Name: 'value',
                    Values: [`production-${AWS_ENVIRONMENT}`]
                  }
                ]
              }
              if (data.NextToken) { opts.NextToken = data.NextToken }
              return Promise.fromCallback((cb) => {
                asg.describeTags(opts, cb)
              })
              .then((awsData) => {
                Array.prototype.push.apply(data.data, awsData.Tags)
                data.NextToken = awsData.NextToken
                data.done = !awsData.NextToken
                return data
              })
            }
          ))
          .then(({ data }) => (data.map((d) => (d.ResourceId))))
      }
    )
  }

  static listASGs (queryUser) {
    return AWSClass.getASGNamesForEnvironment()
      .then((names) => {
        const pageSize = 50
        return Promise.resolve({ names: names, asgs: [] })
          .then(promiseWhile(
            (data) => (!data.names.length),
            (data) => {
              const num = Math.min(pageSize, data.names.length)
              const opts = {
                AutoScalingGroupNames: names.splice(0, num)
              }
              // NextToken is not used here since we are limiting to 50 entries.
              return Promise.fromCallback((cb) => {
                asg.describeAutoScalingGroups(opts, cb)
              })
                .then((awsData) => {
                  Array.prototype.push.apply(
                    data.asgs,
                    awsData.AutoScalingGroups
                  )
                  return data
                })
            }
          ))
          .then((data) => (data.asgs))
      })
      .then((asgs) => (AWSClass._formatASGs(asgs, queryUser)))
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
      .then(AWSClass._formatASGs)
      .then((asgs) => (asgs.shift()))
  }

  static updateASG (asgToUpdate, { desiredSize, minSize, maxSize }) {
    const update = {
      AutoScalingGroupName: asgToUpdate.AutoScalingGroupName
    }
    if (exists(maxSize)) {
      update.MaxSize = maxSize
    }
    if (exists(minSize)) {
      update.MinSize = minSize
    }
    if (exists(desiredSize)) {
      update.DesiredCapacity = desiredSize
    }
    return Promise.fromCallback((cb) => {
      asg.updateAutoScalingGroup(update, cb)
    })
  }

  static scaleInASGByName (name, desiredSize) {
    const _log = log.child({ method: 'scaleInASGByName' })
    _log.info('scaling in ASG by a name')
    return AWSClass.getASGByName(name)
      .then((asgToUpdate) => {
        if (asgToUpdate.Instances.length <= desiredSize) {
          throw new Error('there are already <= instances than the desired size')
        }
        // try to only stop Running instances
        let instances = asgToUpdate.Instances.filter((i) => (
          i.LifecycleState === 'InService'
        ))
        // but if there are not enough, we will target all of them
        if (instances.length < desiredSize) {
          instances = asgToUpdate.Instances
        }
        const instanceIDsToDetach = []
        for (var i = 0; i < (asgToUpdate.Instances.length - desiredSize); i++) {
          instanceIDsToDetach.push(instances[i].InstanceId)
        }
        const update = {
          AutoScalingGroupName: asgToUpdate.AutoScalingGroupName,
          ShouldDecrementDesiredCapacity: true,
          InstanceIds: instanceIDsToDetach
        }
        return Promise.fromCallback((cb) => {
          asg.detachInstances(update, cb)
        })
          .return({ asgToUpdate, removedInstanceIDs: instanceIDsToDetach })
      })
      .then(({ asgToUpdate, removedInstanceIDs }) => {
        return Promise.using(AWSClass._getRabbitMQClient(), (rabbitMQ) => {
          return Promise.map(
            AWSClass.getInstances(removedInstanceIDs),
            (removedInstance) => {
              const job = {
                host: `http://${removedInstance.PrivateIpAddress}:4242`
              }
              return Promise.resolve(
                rabbitMQ.channel.assertExchange('dock.lost')
                  .then(() => (
                    rabbitMQ.channel.publish(
                      'dock.lost',
                      '',
                      new Buffer(JSON.stringify(job))
                    )
                  ))
              )
            }
          )
        })
      })
      .catch((err) => {
        _log.error({ err }, 'error while scaling in an ASG')
        throw err
      })
  }

  static createAWSASGCluster (githubID) {
    // githubId must be a string
    const job = { githubId: githubID.toString() }
    return Promise.using(AWSClass._getRabbitMQClient(), (rabbitMQ) => {
      return Promise.resolve(rabbitMQ.channel.checkQueue('asg.create'))
        .then(() => {
          return Promise.resolve(
            rabbitMQ.channel.sendToQueue(
              'asg.create',
              new Buffer(JSON.stringify(job))
            )
          )
        })
        .delay(100)
    })
  }

  static _getRabbitMQClient () {
    const rabbitMQ = new RabbitMQ()
    return Promise.resolve(
      rabbitMQ.connect()
        .then(() => (rabbitMQ))
    ).disposer(() => (
      rabbitMQ.disconnect()
    ))
  }

  static getMetricsForOrgByID (orgID) {
    // we are going to round down to the nearest 5 minute mark. will make
    // caching easier and make graphs consistant
    let endTime = moment().startOf('minute')
    endTime = endTime.subtract(endTime.minute() % 5, 'minutes')
    let startTime = moment().startOf('minute').subtract(4, 'hours')
    startTime = startTime.subtract(startTime.minute() % 5, 'minutes')
    const NUM_DATAPOINTS = 4 * 60 / 5 // === 48
    const opts = {
      EndTime: endTime.unix(),
      StartTime: startTime.unix(),
      Period: 5 * 60, // 5 minutes
      Namespace: 'Runnable/Swarm',
      MetricName: 'Swarm Reserved Memory',
      Dimensions: [{
        Name: 'AutoScalingGroupName',
        Value: `asg-production-${AWS_ENVIRONMENT}-${orgID}`
      }],
      Statistics: [
        'Average'
      ],
      Unit: 'Percent'
    }
    return cacheLayer.getTimestampedData(orgID, startTime, endTime)
      .then((cachedData) => {
        if (cachedData.length === NUM_DATAPOINTS) {
          return cachedData
        } else {
          const newStart = startTime.add(5 * cachedData.length, 'minutes')
          opts.StartTime = newStart.unix()
          // get and format the new stats
          const newStatsPromise = Promise.fromCallback((cb) => {
            cloudwatch.getMetricStatistics(opts, cb)
          })
            .then((newData) => {
              // this new data is just what we need
              // they are not sorted... let's sort them
              newData.Datapoints = newData.Datapoints.map((d) => ({
                ...d,
                Timestamp: moment(d.Timestamp).unix()
              }))
              return newData.Datapoints.sort((a, b) => {
                if (a.Timestamp < b.Timestamp) { return -1 }
                if (b.Timestamp < a.Timestamp) { return 1 }
                return 0
              })
            })
          // once we have the new stats, save it to a cache
          newStatsPromise.then((newData) => {
            return cacheLayer.saveTimestampedData(orgID, newData)
          })
          // once we have the new stats, concat it to the cached data and return
          return newStatsPromise
            .then((sortedNewData) => {
              Array.prototype.push.apply(cachedData, sortedNewData)
              return cachedData
            })
        }
      })
  }
}

export default AWSClass
