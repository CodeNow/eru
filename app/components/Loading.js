import NProgress from 'nprogress'
import React from 'react'

import ErrorStore from '../error-store'

class Loading extends React.Component {
  constructor () {
    super()
    NProgress.start()
  }

  componentDidMount () {
    this.interval = setInterval(() => {
      NProgress.inc()
    }, 1000)
  }

  _stopLoading () {
    clearTimeout(this.interval)
    NProgress.done()
  }

  componentWillUnmount () {
    this._stopLoading()
  }

  render () {
    const error = ErrorStore.getError()
    if (error) {
      this._stopLoading()
      return (
        <div className='container-fluid'>
          <div className='row'>
            <div className='col-xs-12'>
              <pre>{error}</pre>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className='container-fluid'>
          <div className='row'>
            <div className='col-xs-12'>
              <p className='text-center'>
                <i
                  className='fa fa-spinner fa-spin fa-3x fa-fw margin-bottom'
                >
                </i>
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
}

export default Loading
