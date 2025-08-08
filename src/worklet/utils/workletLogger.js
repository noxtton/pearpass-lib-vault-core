class WorkletLogger {
  constructor({ debugMode = false } = {}) {
    this.output = console.log
    this.debugMode = debugMode
  }

  setLogOutput(output) {
    this.output = output
  }

  setDebugMode(enabled) {
    this.debugMode = enabled
  }

  _print(type, ...args) {
    if (!this.debugMode) return

    this.output(`[${type}] [BARE_RPC]`, ...args)
  }

  log(...args) {
    this._print('LOG', ...args)
  }

  debug(...args) {
    this._print('DEBUG', ...args)
  }

  info(...args) {
    this._print('INFO', ...args)
  }

  warn(...args) {
    this._print('WARN', ...args)
  }

  error(...args) {
    this._print('ERROR', ...args)
  }
}

// Create a default WorkletLogger instance
const workletLogger = new WorkletLogger({ debugMode: true })

// Export both the workletLogger instance and the class
export { workletLogger, WorkletLogger }
