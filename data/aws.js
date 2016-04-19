import loadenv from 'loadenv'
loadenv()

import assign from '101/assign'
import AWS from 'aws-sdk'
import Promise from 'bluebird'

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

const FILTER_PARAMS = {
  Filters: [
    { Name: 'tag:role', Values: ['dock'] },
    {
      Name: 'instance.group-name',
      Values: [ `${AWS_ENVIRONMENT.toLowerCase()}-dock` ]
    }
  ]
}

export default class {
  static listDocks () {
    return Promise.resolve({ instances: [] })
      .then(promiseWhile(
        (data) => (data.done),
        (data) => {
          const opts = assign({}, FILTER_PARAMS)
          if (data.nextToken) { opts.nextToken = data.nextToken }
          return Promise.fromCallback((cb) => {
            ec2.describeInstances(opts, cb)
          })
            .then((awsData) => {
              awsData.Reservations.forEach((r) => {
                r.Instances.forEach((i) => {
                  data.instances.push(i)
                })
              })
              data.nextToken = awsData.nextToken
              data.done = !awsData.nextToken
              return data
            })
        }
      ))
      .then((data) => (data.instances))
  }
}
