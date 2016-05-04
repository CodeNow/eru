import loadenv from 'loadenv'
loadenv()

import assign from '101/assign'
import AWS from 'aws-sdk'
import find from '101/find'
import moment from 'moment'
import Promise from 'bluebird'

import { appClientFactory } from './github'
import CacheLayer from './cache-layer'
import promiseWhile from '../lib/utils/promise-while'
import RabbitMQ from '../lib/models/rabbitmq'

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

  static scaleInASGByName (name, desiredSize) {
    return AWSClass.getASGByName(name)
      .then((asgToUpdate) => {
        desiredSize = Math.max(0, desiredSize)
        if (desiredSize >= asgToUpdate.DesiredCapacity) {
          throw new Error('must scale to lower capacity')
        }
        // if we are wanting smaller than the minimum, we need to bring the
        // minimum down. we can bring the max down as well, but not below the
        // current size.
        const update = {
          AutoScalingGroupName: asgToUpdate.AutoScalingGroupName
        }
        if (desiredSize < asgToUpdate.MinSize) {
          update.MinSize = desiredSize
        }
        if (desiredSize < asgToUpdate.MaxSize) {
          update.MaxSize = Math.max(desiredSize, asgToUpdate.DesiredCapacity)
        }
        return Promise.fromCallback((cb) => {
          asg.updateAutoScalingGroup(update, cb)
        })
          .return(asgToUpdate)
      })
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
        const orgID = asgToUpdate.AutoScalingGroupName.split('-').pop()
        return Promise.using(AWSClass._getRabbitMQClient(), (rabbitMQ) => {
          return Promise.map(
            AWSClass.getInstances(removedInstanceIDs),
            (removedInstance) => {
              const job = {
                githubID: orgID.toString(),
                host: `http://${removedInstance.PrivateIpAddress}:4242`
              }
              return Promise.resolve(
                rabbitMQ.channel.checkQueue('on-dock-unhealthy')
                  .then(() => (
                    rabbitMQ.channel.sendToQueue(
                      'on-dock-unhealthy',
                      new Buffer(JSON.stringify(job))
                    )
                  ))
              )
            }
          )
        })
      })
      .catch((err) => {
        console.error(err.stack || err.message || err)
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
    const cacheLayer = new CacheLayer()
    return cacheLayer.getTimestampedData(orgID, startTime, endTime)
      .then((cachedData) => {
        cachedData = cachedData.map((d) => {
          let [ Timestamp, Average, Unit ] = d.split('::')
          Timestamp = moment(Timestamp).unix()
          return { Timestamp, Average, Unit }
        })
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
              console.log('returning results', cachedData.length)
              return cachedData
            })
        }
      })
  }
}

export default AWSClass
