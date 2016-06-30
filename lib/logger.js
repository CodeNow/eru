import bunyan from 'bunyan'

export default bunyan.createLogger({
  name: 'eru',
  environment: process.env.LOG_ENVIRONMENT || process.env.NODE_ENV,
  streams: [{
    level: process.env.LOG_LEVEL || 'info',
    stream: process.stdout
  }]
})
