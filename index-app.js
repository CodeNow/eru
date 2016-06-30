import loadenv from 'loadenv'
loadenv()

import appServer from './lib/app-server'
import logger from './lib/logger'

const { APP_PORT } = process.env
const log = logger.child({ module: 'index-app' })

log.info('starting app server')
appServer.listen(APP_PORT, () => {
  log.info(`app server running on port ${APP_PORT}`)
})
