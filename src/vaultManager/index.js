import {
  ACTIVE_VAULT_ADD,
  ACTIVE_VAULT_CLOSE,
  ACTIVE_VAULT_GET,
  ACTIVE_VAULT_GET_STATUS,
  ACTIVE_VAULT_INIT,
  ACTIVE_VAULT_LIST,
  ACTIVE_VAULT_REMOVE,
  STORAGE_PATH_SET,
  VAULTS_ADD,
  VAULTS_CLOSE,
  VAULTS_GET_STATUS,
  VAULTS_INIT,
  VAULTS_LIST
} from '../worklet/api'

export class VaultManager {
  constructor(rpc) {
    this.rpc = rpc
  }

  async setStoragePath(path) {
    try {
      const req = this.rpc.request(STORAGE_PATH_SET)

      console.log('Setting storage path:', path)

      await req.send(JSON.stringify({ path }))

      await req.reply('utf8')

      console.log('Storage path set:', path)
    } catch (error) {
      console.error('Error setting storage path:', error)
    }
  }

  async vaultsInit() {
    try {
      const req = this.rpc.request(VAULTS_INIT)

      console.log('Initializing vaults...')

      await req.send()

      await req.reply('utf8')

      console.log('Vaults initialized')
    } catch (error) {
      console.error('Error initializing vaults:', error)
    }
  }

  async vaultsGetStatus() {
    try {
      const req = this.rpc.request(VAULTS_GET_STATUS)

      console.log('Getting vaults status...')

      await req.send()

      const res = await req.reply('utf8')

      console.log('Vaults status:', res)
      return JSON.parse(res)
    } catch (error) {
      console.error('Error getting vaults status:', error)
    }
  }

  async vaultsClose() {
    try {
      const req = this.rpc.request(VAULTS_CLOSE)

      console.log('Closing vaults...')

      await req.send()

      console.log('Vaults closed')

      await req.reply('utf8')
    } catch (error) {
      console.error('Error closing vaults:', error)
    }
  }

  async vaultsAdd(vault) {
    try {
      const req = this.rpc.request(VAULTS_ADD)

      console.log('Adding vault:', vault)

      await req.send(JSON.stringify({ vault }))

      await req.reply('utf8')
      console.log('Vault added:', vault)
    } catch (error) {
      console.error('Error adding vault:', error)
    }
  }

  async vaultsList(filterKey) {
    try {
      const req = this.rpc.request(VAULTS_LIST)

      console.log('Listing vaults:', filterKey)

      await req.send(JSON.stringify({ filterKey }))

      const res = await req.reply('utf8')

      console.log('Vaults listed:', res)

      return JSON.parse(res)
    } catch (error) {
      console.error('Error listing vaults:', error)
    }
  }

  async activeVaultInit(id) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_INIT)

      console.log('Initializing active vault:', id)

      await req.send(JSON.stringify({ id }))

      const res = await req.reply('utf8')

      console.log('Active vault initialized:', res)

      return JSON.parse(res)
    } catch (error) {
      console.error('Error initializing active vault:', error)
    }
  }

  async activeVaultGetStatus() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_GET_STATUS)

      console.log('Getting active vault status...')

      await req.send()

      const res = await req.reply('utf8')

      console.log('Active vault status:', res)

      return JSON.parse(res)
    } catch (error) {
      console.error('Error getting active vault status:', error)
    }
  }

  async activeVaultClose() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_CLOSE)

      console.log('Closing active vault...')

      await req.send()

      await req.reply('utf8')

      console.log('Active vault closed')
    } catch (error) {
      console.error('Error closing active vault:', error)
    }
  }

  async activeVaultAdd(key, data) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_ADD)

      console.log('Adding active vault:', key, data)

      await req.send(JSON.stringify({ key, data }))

      await req.reply('utf8')

      console.log('Active vault added:', key, data)
    } catch (error) {
      console.error('Error adding active vault:', error)
    }
  }

  async activeVaultRemove(key) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_REMOVE)

      console.log('Removing active vault:', key)

      await req.send(JSON.stringify({ key }))

      await req.reply('utf8')

      console.log('Active vault removed:', key)
    } catch (error) {
      console.error('Error removing active vault:', error)
    }
  }

  async activeVaultList() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_LIST)

      console.log('Listing active vault...')

      await req.send()

      const res = await req.reply('utf8')

      console.log('Active vault listed:', res)

      return JSON.parse(res)
    } catch (error) {
      console.error('Error listing active vault:', error)
    }
  }

  async activeVaultGet(key) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_GET)

      console.log('Getting active vault:', key)

      await req.send(JSON.stringify({ key }))

      const res = await req.reply('utf8')

      console.log('Active vault:', res)

      return JSON.parse(res)
    } catch (error) {
      console.error('Error getting active vault:', error)
    }
  }
}
