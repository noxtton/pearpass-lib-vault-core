import RPC from 'bare-rpc'

import {
  ACTIVE_VAULT_CLOSE,
  VAULTS_CLOSE,
  ACTIVE_VAULT_INIT,
  VAULTS_INIT,
  STORAGE_PATH_SET,
  ACTIVE_VAULT_ADD,
  VAULTS_ADD,
  ACTIVE_VAULT_REMOVE,
  VAULTS_LIST,
  ACTIVE_VAULT_LIST,
  ACTIVE_VAULT_GET,
  VAULTS_GET_STATUS,
  ACTIVE_VAULT_GET_STATUS,
  ACTIVE_VAULT_CREATE_INVITE,
  PAIR,
  INIT_LISTENER,
  ON_UPDATE,
  ENCRYPTION_INIT,
  ENCRYPTION_GET_STATUS,
  ENCRYPTION_GET,
  ENCRYPTION_ADD,
  ENCRYPTION_CLOSE,
  ENCRYPTION_ENCRYPT_VAULT_KEY,
  ENCRYPTION_DECRYPT_VAULT_KEY,
  ENCRYPTION_GET_DECRYPTION_KEY,
  VAULTS_GET
} from './api'
import {
  vaultsInit,
  encryptionClose,
  closeVaultsInstance,
  vaultsAdd,
  vaultsList,
  activeVaultAdd,
  initActiveVaultInstance,
  closeActiveVaultInstance,
  vaultRemove,
  activeVaultList,
  activeVaultGet,
  createInvite,
  pair,
  initListener,
  encryptionInit,
  encryptionGet,
  encryptionAdd,
  setStoragePath,
  getIsVaultsInitialized,
  getIsActiveVaultInitialized,
  getIsEncryptionInitialized,
  vaultsGet
} from './appDeps'
import { decryptVaultKey } from './decryptVaultKey'
import { encryptVaultKey } from './encryptVaultKey'
import { getDecryptionKey } from './getDecryptionKey'

export const handleRpcCommand = async (req) => {
  const data = req?.data ? JSON.parse(req?.data) : undefined

  switch (req.command) {
    case STORAGE_PATH_SET:
      setStoragePath(data?.path)

      req.reply(JSON.stringify({ success: true }))

      break

    case VAULTS_INIT:
      try {
        if (!data.encryptionKey) {
          throw new Error('Password is required')
        }

        const res = await vaultsInit(data.encryptionKey)

        req.reply(JSON.stringify({ success: true, res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error initializing vaults: ${error}`
          })
        )
      }

      break

    case VAULTS_GET_STATUS:
      req.reply(JSON.stringify({ status: getIsVaultsInitialized() }))

      break

    case VAULTS_GET:
      try {
        const res = await vaultsGet(data?.key)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting records from active vault: ${error}`
          })
        )
      }

      break

    case VAULTS_CLOSE:
      try {
        await closeVaultsInstance()

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error closing vaults: ${error}`
          })
        )
      }

      break

    case VAULTS_ADD:
      try {
        await vaultsAdd(data?.key, data?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding vault: ${error}`
          })
        )
      }

      break

    case VAULTS_LIST:
      try {
        const vaults = await vaultsList(data?.filterKey)

        req.reply(JSON.stringify({ data: vaults }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error listing vaults: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_INIT:
      try {
        await initActiveVaultInstance(data?.id, data?.encryptionKey)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error initializing active vault: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_GET_STATUS:
      req.reply(JSON.stringify({ status: getIsActiveVaultInitialized() }))

      break

    case ACTIVE_VAULT_CLOSE:
      try {
        await closeActiveVaultInstance()

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error closing active vault: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_ADD:
      try {
        await activeVaultAdd(data?.key, data?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding record to active vault: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_REMOVE:
      try {
        await vaultRemove(data?.key)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error removing record from active vault: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_LIST:
      try {
        const res = await activeVaultList(data?.filterKey)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error listing records from active vault: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_GET:
      try {
        const res = await activeVaultGet(data?.key)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting records from active vault: ${error}`
          })
        )
      }

      break

    case ACTIVE_VAULT_CREATE_INVITE:
      try {
        const invite = await createInvite()

        req.reply(JSON.stringify({ data: invite }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error creating invite from active vault: ${error}`
          })
        )
      }

      break

    case PAIR:
      try {
        const inviteCode = data.inviteCode

        const vault = await pair(inviteCode)

        req.reply(JSON.stringify({ data: vault }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error pairing with invite code: ${error}`
          })
        )
      }

      break

    case INIT_LISTENER:
      try {
        if (!getIsActiveVaultInitialized()) {
          throw new Error('Active vault not initialized')
        }

        const vaultId = data.vaultId

        await initListener({
          vaultId: vaultId,
          onUpdate: () => {
            const req = rpc.request(ON_UPDATE)

            req.send()
          }
        })

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error initializing listener: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_INIT:
      try {
        await encryptionInit('encryption')

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error initializing encryption: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_GET_STATUS:
      req.reply(JSON.stringify({ status: getIsEncryptionInitialized() }))

      break

    case ENCRYPTION_GET:
      try {
        const res = await encryptionGet(data?.key)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting encryption data: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_ADD:
      try {
        await encryptionAdd(data?.key, data?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding encryption data: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_ENCRYPT_VAULT_KEY:
      try {
        const res = encryptVaultKey(data.password)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error encrypting vault key: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_GET_DECRYPTION_KEY:
      try {
        const { salt, password } = data

        const decryptionKey = getDecryptionKey({
          password,
          salt
        })

        req.reply(JSON.stringify({ data: decryptionKey }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error decrypting vault key: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_DECRYPT_VAULT_KEY:
      try {
        const { ciphertext, nonce, decryptionKey } = data

        const res = decryptVaultKey({
          ciphertext,
          nonce,
          decryptionKey
        })

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error decrypting vault key: ${error}`
          })
        )
      }

      break

    case ENCRYPTION_CLOSE:
      try {
        await encryptionClose()

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error closing encryption: ${error}`
          })
        )
      }

      break

    default:
      req.reply(JSON.stringify({ error: 'Command not found' }))
  }
}

export const rpc = new RPC(BareKit.IPC, handleRpcCommand)
