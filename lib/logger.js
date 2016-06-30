import bunyan from 'bunyan'

export default bunyan.createLogger({
  name: 'eru',
  streams: [{
    level: process.env.LOG_LEVEL || 'info',
    stream: process.stdout
  }]
})
