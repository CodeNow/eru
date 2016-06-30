'use strict'

import amqplib from 'amqplib'
import Immutable from 'immutable'
import Promise from 'bluebird'

import logger from '../logger'

export default class RabbitMQ {
  constructor (opts) {
    this.connection = null
    this.channel = null
    this.hostname = process.env.RABBITMQ_HOSTNAME || 'localhost'
    this.port = process.env.RABBITMQ_PORT || 5672
    this.username = process.env.RABBITMQ_USERNAME
    this.password = process.env.RABBITMQ_PASSWORD
    this.subscriptions = new Immutable.Map()
    this.subscribed = new Immutable.Set()
    this.consuming = new Immutable.Set()
    this.log = logger.child({
      module: 'lib/models/rabbitmq',
      model: 'rabbitmq'
    })
    return this
  }

  connect () {
    const log = this.log.child({ method: 'connect' })
    log.info('starting connect')
    if (this.connection || this.channel) {
      throw new Error('cannot call connect twice')
    }
    let url = `${this.hostname}:${this.port}`
    if (this.username && this.password) {
      url = `${this.username}:${this.password}@${url}`
    }
    url = `amqp://${url}`
    log.trace({ url }, 'connecting')
    return Promise.resolve(amqplib.connect(url, {}))
      .catch((err) => {
        log.error({ err }, 'an error occured while connecting')
        throw err
      })
      .then((conn) => {
        log.trace('connected')
        this.connection = conn
        this.connection.on('error', this.connectionErrorHandler.bind(this))
      })
      .then(() => {
        log.trace('creating channel')
        return Promise.resolve(this.connection.createChannel())
          .catch((err) => {
            log.error({ err }, 'an error occured creating channel')
            throw err
          })
      })
      .then((channel) => {
        log.trace('created channel')
        this.channel = channel
        this.channel.on('error', this.channelErrorHandler.bind(this))
      })
  }

  disconnect () {
    const log = this.log.child({ method: 'disconnect' })
    log.info('disconnecting')
    if (!this.connection) {
      throw new Error('cannot disconnect when not connected')
    }
    return Promise.resolve(this.connection.close())
  }

  connectionErrorHandler (err) {
    const log = this.log.child({ method: 'connectionErrorHandler' })
    log.error({ err: err }, 'connection has caused an error')
    throw err
  }

  channelErrorHandler (err) {
    const log = this.log.child({ method: 'channelErrorHandler' })
    log.error({ err: err }, 'channel has caused an error')
    throw err
  }
}
