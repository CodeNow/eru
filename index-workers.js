import loadenv from 'loadenv'
loadenv()

import Runnable from './data/runnable'
import workerServer from './lib/worker-server'

Runnable.connect()
  .then(() => (workerServer.start()))
