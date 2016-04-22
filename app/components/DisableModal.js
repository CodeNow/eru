import React from 'react'

class DisableModal extends React.Component {
  render () {
    const backdropClass = 'modal-backdrop ' + (this.props.open ? 'in' : '')
    const modalClass = 'modal ' + (this.props.open ? 'in' : '')
    const modalStyle = {
      display: this.props.open ? 'block' : 'none'
    }
    return (
      <span>
        <div
          className={backdropClass}
          style={modalStyle}
        >
        </div>
        <div
          className={modalClass}
          tabIndex='-1'
          role='dialog'
          style={modalStyle}
        >
          <div className='modal-dialog'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h4 className='modal-title'>Confirm Disable</h4>
              </div>
              <div className='modal-body'>
                <p>
                  Please confirm you would like to disable this organization.
                </p>
              </div>
              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-default'
                  data-dismiss='modal'
                  onClick={this.props.closeModal}
                >
                  Nope
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={this.props.confirmSuccess}
                >
                  Yup, Disable It!
                </button>
              </div>
            </div>
          </div>
        </div>
      </span>
    )
  }
}

export default DisableModal
