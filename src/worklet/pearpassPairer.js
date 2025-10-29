import Autopass from 'autopass'
import Corestore from 'corestore'

export class PearPassPairer {
  constructor() {
    /**
     * @type {Corestore | null}
     */
    this.store = null
  }

  async pairInstance(path, invite) {
    this.store = new Corestore(path)

    if (!this.store) {
      throw new Error('Error creating store')
    }

    try {
      const pair = Autopass.pair(this.store, invite)

      const instance = await pair.finished()

      await instance.ready()

      await instance.close()

      this.store = null

      return instance.encryptionKey.toString('base64')
    } catch (error) {
      this.store = null
      throw new Error(`Pairing failed: ${error.message}`)
    }
  }

  async cancelPairing() {
    if (!this.store) {
      throw new Error('No store to close')
    }

    try {
      await this.store.close()
      this.store = null
    } catch (error) {
      throw new Error(`Cancel pairing failed: ${error.message}`)
    }
  }
}
