import React from 'react'

export default class Alert extends React.Component {
  static propTypes = {
    _clearAlertMessage: React.PropTypes.func,
    alertMessages: React.PropTypes.array.isRequired
  }

  _clearSingleMessage = (index) => {
    return () => {
      this.props._clearAlertMessage(index)
    }
  }

  render () {
    const { alertMessages } = this.props
    let baseClasses = 'alert alert-dismissible'
    const alerts = alertMessages.map((m, i) => {
      let prefix = 'Info:'
      let classNames = 'alert-info'
      if (m.level === 'error') {
        prefix = 'Error:'
        classNames = 'alert-danger'
      } else if (m.level === 'success') {
        prefix = 'Success:'
        classNames = 'alert-success'
      }
      return (
        <div className='col-xs-12' key={`message:${i}`} >
          <div className={`${baseClasses} ${classNames}`}>
            <button
              type='button'
              className='close'
              onClick={this._clearSingleMessage(i)}
            >
              <span className='glyphicon glyphicon-remove'></span>
            </button>
            <strong>{prefix}</strong> {m.message}
          </div>
        </div>
      )
    })

    return (
      <div className='row'>
        {alerts}
      </div>
    )
  }
}
