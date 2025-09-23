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

    const pair = Autopass.pair(this.store, invite)

    const instance = await pair.finished()

    await instance.ready()

    await instance.close()

    this.store = null

    return instance.encryptionKey.toString('base64')
  }

  async cancelPairing() {
    if (!this.store) {
      throw new Error('No store to close')
    }

    await this.store.close()
    this.store = null
  }
}
