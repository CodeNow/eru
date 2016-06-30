class ErrorStore {
  constructor () {
    this._error = null
  }

  setError (err) {
    this._error = err
  }

  getError () {
    return this._error
  }
}

export default new ErrorStore()
