import getBabelRelayPlugin from 'babel-relay-plugin'

const schema = require('../data/schema.json')

module.exports = getBabelRelayPlugin(schema.data)
