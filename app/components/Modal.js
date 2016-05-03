import React from 'react'

class Modal extends React.Component {
  static propTypes = {
    body: React.PropTypes.object.isRequired,
    title: React.PropTypes.string.isRequired,
    cancelPrompt: React.PropTypes.string,
    confirmPrompt: React.PropTypes.string
  }

  static defaultProps = {
    cancelPrompt: 'Nope',
    confirmPrompt: 'Yup'
  }

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
                <h4 className='modal-title'>{this.props.title}</h4>
              </div>
              <div className='modal-body'>
                {this.props.body}
              </div>
              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-default'
                  data-dismiss='modal'
                  onClick={this.props.closeModal}
                >
                  {this.props.cancelPrompt}
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={this.props.confirmSuccess}
                >
                  {this.props.confirmPrompt}
                </button>
              </div>
            </div>
          </div>
        </div>
      </span>
    )
  }
}

export default Modal
