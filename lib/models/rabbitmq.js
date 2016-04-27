'use strict'

import amqplib from 'amqplib'
import Immutable from 'immutable'
import Promise from 'bluebird'

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
    return this
  }

  connect () {
    if (this.connection || this.channel) {
      throw new Error('cannot call connect twice')
    }
    let url = `${this.hostname}:${this.port}`
    if (this.username && this.password) {
      url = `${this.username}:${this.password}@${url}`
    }
    url = `amqp://${url}`
    console.log({ url }, 'connecting')
    return Promise.resolve(amqplib.connect(url, {}))
      .catch((err) => {
        console.error({ err: err }, 'an error occured while connecting')
        throw err
      })
      .then((conn) => {
        console.log('connected')
        this.connection = conn
        this.connection.on('error', this.connectionErrorHandler.bind(this))
      })
      .then(() => {
        console.log('creating channel')
        return Promise.resolve(this.connection.createChannel())
          .catch((err) => {
            console.error({ err: err }, 'an error occured creating channel')
            throw err
          })
      })
      .then((channel) => {
        console.log('created channel')
        this.channel = channel
        this.channel.on('error', this.channelErrorHandler.bind(this))
      })
  }

  disconnect () {
    if (!this.connection) {
      throw new Error('cannot disconnect when not connected')
    }
    console.log('disconnecting')
    return Promise.resolve(this.connection.close())
  }

  connectionErrorHandler (err) {
    console.error({ err: err }, 'connection has caused an error')
    throw err
  }

  channelErrorHandler (err) {
    console.error({ err: err }, 'channel has caused an error')
    throw err
  }
}
