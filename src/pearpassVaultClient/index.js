import EventEmitter from 'events'

import RPC from 'bare-rpc'
import cenc from 'compact-encoding'
import FramedStream from 'framed-stream'

import { receiveFileStream } from '../utils/recieveFileStream'
import { sendFileStream } from '../utils/sendFileStream'
import {
  ACTIVE_VAULT_ADD,
  ACTIVE_VAULT_CLOSE,
  ACTIVE_VAULT_CREATE_INVITE,
  ACTIVE_VAULT_DELETE_INVITE,
  ACTIVE_VAULT_FILE_ADD,
  ACTIVE_VAULT_FILE_GET,
  ACTIVE_VAULT_FILE_REMOVE,
  ACTIVE_VAULT_GET,
  ACTIVE_VAULT_GET_STATUS,
  ACTIVE_VAULT_INIT,
  ACTIVE_VAULT_LIST,
  ACTIVE_VAULT_REMOVE,
  CLOSE,
  ENCRYPTION_ADD,
  ENCRYPTION_CLOSE,
  ENCRYPTION_DECRYPT_VAULT_KEY,
  ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD,
  ENCRYPTION_ENCRYPT_VAULT_WITH_KEY,
  ENCRYPTION_GET,
  ENCRYPTION_GET_DECRYPTION_KEY,
  ENCRYPTION_GET_STATUS,
  ENCRYPTION_HASH_PASSWORD,
  ENCRYPTION_INIT,
  INIT_LISTENER,
  ON_UPDATE,
  PAIR,
  STORAGE_PATH_SET,
  VAULTS_ADD,
  VAULTS_CLOSE,
  VAULTS_GET,
  VAULTS_GET_STATUS,
  VAULTS_INIT,
  VAULTS_LIST,
  WORKLET_LOGGER
} from '../worklet/api'

export class PearpassVaultClient extends EventEmitter {
  constructor(worklet, storagePath, { debugMode = false } = {}) {
    super()

    this.debugMode = debugMode

    this._logger = {
      log: (...args) => {
        if (!this.debugMode) {
          return
        }

        console.log(...args)
      },
      error: (...args) => {
        console.error(...args)
      }
    }

    this.rpc = new RPC(new FramedStream(worklet.IPC), (req) => {
      switch (req.command) {
        case ON_UPDATE:
          this.emit('update')

          break

        case WORKLET_LOGGER:
          const logger = cenc.decode(cenc.json, req.data)

          this._logger.log('WORKLET: ', logger.data)

          break

        default:
          this._logger.error('Unknown command:', req.command)
      }
    })

    if (storagePath) {
      this.setStoragePath(storagePath)
    }
  }

  async setStoragePath(path) {
    try {
      const req = this.rpc.request(STORAGE_PATH_SET)

      this._logger.log('Setting storage path:', path)

      req.send(JSON.stringify({ path }))

      console.log('Sending request to set storage path:', { path })

      this._logger.log('Request sent to set storage path:', req.sent)

      await req.reply()

      this._logger.log('Storage path set:', path)
    } catch (error) {
      this._logger.error('Error setting storage path:', error)
    }
  }

  async vaultsInit(encryptionKey) {
    try {
      const req = this.rpc.request(VAULTS_INIT)

      this._logger.log('Initializing vaults...', encryptionKey)

      await req.send(
        JSON.stringify({
          encryptionKey: encryptionKey
        })
      )

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      if (parsedRes.error) {
        throw new Error(parsedRes.error)
      }

      this._logger.log('Vaults initialized', res)
    } catch (error) {
      this._logger.error('Error initializing vaults:', error)

      if (error.message.includes('ELOCKED')) {
        throw new Error('ELOCKED')
      }
    }
  }

  async vaultsGetStatus() {
    try {
      const req = this.rpc.request(VAULTS_GET_STATUS)

      this._logger.log('Getting vaults status...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Vaults status:', res)

      return JSON.parse(res)
    } catch (error) {
      this._logger.error('Error getting vaults status:', error)
    }
  }

  async vaultsGet(key) {
    try {
      const req = this.rpc.request(VAULTS_GET)

      this._logger.log('Getting from vaults:', key)

      await req.send(JSON.stringify({ key }))

      const res = await req.reply('utf8')

      this._logger.log('Vaults:', res)

      const parsedRed = JSON.parse(res)

      return parsedRed.data
    } catch (error) {
      this._logger.error('Error getting from vaults:', error)
    }
  }

  async vaultsClose() {
    try {
      const req = this.rpc.request(VAULTS_CLOSE)

      this._logger.log('Closing vaults...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Vaults closed', res)
    } catch (error) {
      this._logger.error('Error closing vaults:', error)
    }
  }

  async vaultsAdd(key, vault) {
    try {
      const req = this.rpc.request(VAULTS_ADD)

      this._logger.log('Adding vault data in vaults:', {
        key,
        data: vault
      })

      await req.send(JSON.stringify({ key, data: vault }))

      await req.reply('utf8')
      this._logger.log('Vault added:', { key, data: vault })
    } catch (error) {
      this._logger.error('Error adding vault:', error)
    }
  }

  async activeVaultAddFile(key, buffer) {
    try {
      this._logger.log('Adding file to active vault:', { key })

      const req = this.rpc.request(ACTIVE_VAULT_FILE_ADD)

      const stream = req.createRequestStream()

      await sendFileStream({
        stream,
        buffer,
        metaData: { key }
      })

      const res = await req.reply('utf8')

      this._logger.log('File added', res)
    } catch (error) {
      this._logger.error('Error adding file to active vault:', error)
    }
  }

  async activeVaultGetFile(key) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_FILE_GET)

      this._logger.log('Getting file from active vault:', {
        key
      })

      req.send(JSON.stringify({ key }))

      const stream = req.createResponseStream()

      const { buffer } = await receiveFileStream(stream)

      this._logger.log('File from active vault:', { key })

      return buffer
    } catch (error) {
      this._logger.error('Error getting file from active vault:', error)
    }
  }

  async activeVaultRemoveFile(key) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_FILE_REMOVE)

      this._logger.log('Removing file from active vault:', {
        key
      })

      await req.send(JSON.stringify({ key }))

      await req.reply('utf8')
      this._logger.log('File removed from active vault:', { key })
    } catch (error) {
      this._logger.error('Error removing file from active vault:', error)
    }
  }

  async vaultsList(filterKey) {
    try {
      const req = this.rpc.request(VAULTS_LIST)

      this._logger.log('Listing vaults:', filterKey)

      await req.send(JSON.stringify({ filterKey }))

      const res = await req.reply('utf8')

      this._logger.log('Vaults listed:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error listing vaults:', error)
    }
  }

  async activeVaultInit({ id, encryptionKey }) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_INIT)

      this._logger.log('Initializing active vault:', id)

      await req.send(JSON.stringify({ id, encryptionKey }))

      const res = await req.reply('utf8')

      this._logger.log('Active vault initialized:', res)

      return JSON.parse(res)
    } catch (error) {
      this._logger.error('Error initializing active vault:', error)
    }
  }

  async activeVaultGetStatus() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_GET_STATUS)

      this._logger.log('Getting active vault status...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Active vault status:', res)

      return JSON.parse(res)
    } catch (error) {
      this._logger.error('Error getting active vault status:', error)
    }
  }

  async activeVaultClose() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_CLOSE)

      this._logger.log('Closing active vault...')

      await req.send()

      await req.reply('utf8')

      this._logger.log('Active vault closed')
    } catch (error) {
      this._logger.error('Error closing active vault:', error)
    }
  }

  async activeVaultAdd(key, data) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_ADD)

      this._logger.log('Adding active vault:', key, data)

      await req.send(JSON.stringify({ key, data }))

      await req.reply('utf8')

      this._logger.log('Active vault added:', key, data)
    } catch (error) {
      this._logger.error('Error adding active vault:', error)
    }
  }

  async activeVaultRemove(key) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_REMOVE)

      this._logger.log('Removing active vault:', key)

      await req.send(JSON.stringify({ key }))

      await req.reply('utf8')

      this._logger.log('Active vault removed:', key)
    } catch (error) {
      this._logger.error('Error removing active vault:', error)
    }
  }

  async activeVaultList(filterKey) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_LIST)

      this._logger.log('Listing active vault...')

      await req.send(JSON.stringify({ filterKey }))

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      this._logger.log('Active vault listed:', parsedRes)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error listing active vault:', error)
    }
  }

  async activeVaultGet(key) {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_GET)

      this._logger.log('Getting active vault:', key)

      await req.send(JSON.stringify({ key }))

      const res = await req.reply('utf8')

      this._logger.log('Active vault:', res)

      const parsedRed = JSON.parse(res)

      return parsedRed.data
    } catch (error) {
      this._logger.error('Error getting active vault:', error)
    }
  }

  async activeVaultCreateInvite() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_CREATE_INVITE)

      this._logger.log('Creating invite...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Invite created:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error creating invite:', error)
    }
  }

  async activeVaultDeleteInvite() {
    try {
      const req = this.rpc.request(ACTIVE_VAULT_DELETE_INVITE)

      this._logger.log('Deleting invite...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Invite deleted:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.success
    } catch (error) {
      this._logger.error('Error deleting invite:', error)
    }
  }

  async pair(inviteCode) {
    try {
      const req = this.rpc.request(PAIR)

      this._logger.log('Pairing with invite code:', inviteCode)

      await req.send(JSON.stringify({ inviteCode }))

      const res = await req.reply('utf8')

      this._logger.log('Paired:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error pairing:', error)
    }
  }

  async initListener({ vaultId }) {
    try {
      const req = this.rpc.request(INIT_LISTENER)

      this._logger.log('Initializing listener:', vaultId)

      await req.send(JSON.stringify({ vaultId }))

      const res = await req.reply('utf8')

      this._logger.log('Listener initialized:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.success
    } catch (error) {
      this._logger.error('Error pairing:', error)
    }
  }

  async encryptionInit() {
    try {
      const req = this.rpc.request(ENCRYPTION_INIT)

      this._logger.log('Initializing encryption...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Encryption initialized:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.success
    } catch (error) {
      this._logger.error('Error initializing encryption:', error)
    }
  }

  async encryptionGetStatus() {
    try {
      const req = this.rpc.request(ENCRYPTION_GET_STATUS)

      this._logger.log('Getting encryption status...')

      await req.send()

      const res = await req.reply('utf8')

      this._logger.log('Encryption status:', res)

      return JSON.parse(res)
    } catch (error) {
      this._logger.error('Error getting encryption status:', error)
    }
  }

  async encryptionGet(key) {
    try {
      const req = this.rpc.request(ENCRYPTION_GET)

      this._logger.log('Getting encryption:', key)

      await req.send(JSON.stringify({ key }))

      const res = await req.reply('utf8')

      this._logger.log('Encryption:', res)

      const parsedRes = JSON.parse(res)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error getting encryption:', error)
    }
  }

  async encryptionAdd(key, data) {
    try {
      const req = this.rpc.request(ENCRYPTION_ADD)

      this._logger.log('Adding encryption:', key, data)

      await req.send(JSON.stringify({ key, data }))

      await req.reply('utf8')

      this._logger.log('Encryption added:', key, data)
    } catch (error) {
      this._logger.error('Error adding encryption:', error)
    }
  }

  async hashPassword(password) {
    try {
      const req = this.rpc.request(ENCRYPTION_HASH_PASSWORD)

      this._logger.log(ENCRYPTION_HASH_PASSWORD, password)

      await req.send(JSON.stringify({ password }))

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      this._logger.log(ENCRYPTION_HASH_PASSWORD, 'done', parsedRes)

      return parsedRes.data
    } catch (error) {
      this._logger.error(ENCRYPTION_HASH_PASSWORD, 'Error', error)
    }
  }

  async encryptVaultKeyWithHashedPassword(hashedPassword) {
    try {
      const req = this.rpc.request(
        ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD
      )

      this._logger.log(
        ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD,
        hashedPassword
      )

      await req.send(JSON.stringify({ hashedPassword }))

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      this._logger.log(
        ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD,
        'done',
        parsedRes
      )

      return parsedRes.data
    } catch (error) {
      this._logger.error(
        ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD,
        'error',
        error
      )
    }
  }

  async encryptVaultWithKey(hashedPassword, key) {
    try {
      const req = this.rpc.request(ENCRYPTION_ENCRYPT_VAULT_WITH_KEY)

      this._logger.log(ENCRYPTION_ENCRYPT_VAULT_WITH_KEY, {
        hashedPassword,
        key
      })

      await req.send(JSON.stringify({ hashedPassword, key }))

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      this._logger.log(ENCRYPTION_ENCRYPT_VAULT_WITH_KEY, 'done', parsedRes)

      return parsedRes.data
    } catch (error) {
      this._logger.error(ENCRYPTION_ENCRYPT_VAULT_WITH_KEY, 'Error', error)
    }
  }

  async getDecryptionKey({ salt, password }) {
    try {
      const req = this.rpc.request(ENCRYPTION_GET_DECRYPTION_KEY)

      this._logger.log('Getting decryption key', {
        salt,
        password
      })

      await req.send(
        JSON.stringify({
          salt,
          password
        })
      )

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      this._logger.log('Decryption key', parsedRes)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error getting decryption:', error)
    }
  }

  async decryptVaultKey({ ciphertext, nonce, hashedPassword }) {
    try {
      const req = this.rpc.request(ENCRYPTION_DECRYPT_VAULT_KEY)

      this._logger.log('Decrypting vault key', {
        ciphertext,
        nonce,
        hashedPassword
      })

      await req.send(
        JSON.stringify({
          ciphertext,
          nonce,
          hashedPassword
        })
      )

      const res = await req.reply('utf8')

      const parsedRes = JSON.parse(res)

      this._logger.log('Vault key decrypted', parsedRes)

      return parsedRes.data
    } catch (error) {
      this._logger.error('Error adding encryption:', error)
    }
  }

  async encryptionClose() {
    try {
      const req = this.rpc.request(ENCRYPTION_CLOSE)

      this._logger.log('Closing encryption...')

      await req.send()

      await req.reply('utf8')

      this._logger.log('Encryption closed')
    } catch (error) {
      this._logger.error('Error closing encryption:', error)
    }
  }

  async close() {
    try {
      const req = this.rpc.request(CLOSE)

      this._logger.log('Closing instances...')

      await req.send()

      await req.reply('utf8')

      this._logger.log('Instances closed')
    } catch (error) {
      this._logger.error('Error closing instances:', error)
    }
  }
}
