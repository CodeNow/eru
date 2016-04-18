import loadenv from 'loadenv'
loadenv()

import appServer from './lib/app-server'

const { APP_PORT } = process.env

appServer.listen(APP_PORT, () => {
  console.log(`App Server running on port ${APP_PORT}`)
})
