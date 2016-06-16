import loadenv from 'loadenv'
loadenv()

import cacheLayer from './data/cache-layer'
import Runnable from './data/runnable'
import workerServer from './lib/worker-server'

Runnable.connect()
  .then(() => (cacheLayer.connect()))
  .then(() => (workerServer.start()))
