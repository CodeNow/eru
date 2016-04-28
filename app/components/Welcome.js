import React from 'react'

class Welcome extends React.Component {
  static propTypes = {
    _setAlertMessage: React.PropTypes.func
  }

  _setSampleAlert = () => {
    this.props._setAlertMessage('OMG WOW ALERTING')
  }

  render () {
    return (
      <div className='row'>
        <div className='col-md-12'>
          <h4>Hello</h4>
          <button
            className='btn btn-default'
            onClick={this._setSampleAlert}
          >
            Sample Alert
          </button>
        </div>
      </div>
    )
  }
}

export default Welcome
