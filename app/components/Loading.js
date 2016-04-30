import NProgress from 'nprogress'
import React from 'react'

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

  componentWillUnmount () {
    clearTimeout(this.interval)
    NProgress.done()
  }

  render () {
    return (
      <div className='row'>
        <div className='col-xs-12'>
          <p className='text-center'>
            <i className='fa fa-spinner fa-spin fa-3x fa-fw margin-bottom'></i>
          </p>
        </div>
      </div>
    )
  }
}

export default Loading
