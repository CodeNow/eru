import React from 'react'

class Welcome extends React.Component {
  static propTypes = {
    alertMessage: React.PropTypes.func
  }

  sampleError = () => {
    this.props.alertMessage({
      level: 'error',
      message: `OMG WOW ${Math.random()}`
    })
  }

  sampleSuccess = () => {
    this.props.alertMessage({
      level: 'success',
      message: `YAY!! ${Math.random()}`
    })
  }

  render () {
    return (
      <div className='row'>
        <div className='col-md-12'>
          <h4>Hello</h4>
          <button
            className='btn btn-danger'
            onClick={this.sampleError}
          >
            Sample Error
          </button>
          <button
            className='btn btn-success'
            onClick={this.sampleSuccess}
          >
            Sample Success
          </button>
        </div>
      </div>
    )
  }
}

export default Welcome
