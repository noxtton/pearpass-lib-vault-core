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

  log(...args) {
    if (!this.debugMode) return
    this.output('[LOG] [BARE_RPC]', ...args)
  }

  debug(...args) {
    if (!this.debugMode) return
    this.output('[DEBUG] [BARE_RPC]', ...args)
  }

  info(...args) {
    if (!this.debugMode) return
    this.output('[INFO]  [BARE_RPC]', ...args)
  }

  warn(...args) {
    if (!this.debugMode) return
    this.output('[WARN]  [BARE_RPC]', ...args)
  }

  error(...args) {
    if (!this.debugMode) return
    this.output('[ERROR] [BARE_RPC]', ...args)
  }
}

// Create a default WorkletLogger instance
const workletLogger = new WorkletLogger({ debugMode: true })

// Export both the workletLogger instance and the class
export { workletLogger, WorkletLogger }
