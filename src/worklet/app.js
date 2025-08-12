import RPC from 'bare-rpc'
import FramedStream from 'framed-stream'

import API from './api'
import {
  activeVaultAdd,
  activeVaultAddFile,
  activeVaultGet,
  activeVaultGetFile,
  activeVaultList,
  activeVaultRemoveFile,
  closeActiveVaultInstance,
  closeAllInstances,
  closeVaultsInstance,
  createInvite,
  deleteInvite,
  encryptionAdd,
  encryptionClose,
  encryptionGet,
  encryptionInit,
  getIsActiveVaultInitialized,
  getIsEncryptionInitialized,
  getIsVaultsInitialized,
  initActiveVaultInstance,
  initListener,
  pairActiveVault,
  cancelPairActiveVault,
  setStoragePath,
  vaultRemove,
  vaultsAdd,
  vaultsGet,
  vaultsInit,
  vaultsList
} from './appDeps'
import { decryptVaultKey } from './decryptVaultKey'
import { encryptVaultKeyWithHashedPassword } from './encryptVaultKeyWithHashedPassword'
import { encryptVaultWithKey } from './encryptVaultWithKey'
import { getDecryptionKey } from './getDecryptionKey'
import { hashPassword } from './hashPassword'
import { receiveFileStream } from '../utils/recieveFileStream'
import { sendFileStream } from '../utils/sendFileStream'
import { isPearWorker } from './utils/isPearWorker'
import { parseRequestData } from './utils/parseRequestData'
import { workletLogger } from './utils/workletLogger'

export const handleRpcCommand = async (req) => {
  const requestData = parseRequestData(req.data)

  switch (req.command) {
    case API.STORAGE_PATH_SET:
      try {
        workletLogger.log('Setting storage path:', requestData?.path)

        setStoragePath(requestData?.path)

        req.reply(JSON.stringify({ success: true }))

        workletLogger.log('Storage path set successfully:', requestData?.path)
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error setting storage path: ${error}`
          })
        )
      }

      break

    case API.MASTER_VAULT_INIT:
      try {
        if (!requestData.encryptionKey) {
          throw new Error('Password is required')
        }

        const res = await vaultsInit(requestData.encryptionKey)

        req.reply(JSON.stringify({ success: true, res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error initializing vaults: ${error}`
          })
        )
      }

      break

    case API.MASTER_VAULT_GET_STATUS:
      req.reply(JSON.stringify({ status: getIsVaultsInitialized() }))

      break

    case API.MASTER_VAULT_GET:
      try {
        const res = await vaultsGet(requestData?.key)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting records from active vault: ${error}`
          })
        )
      }

      break

    case API.MASTER_VAULT_CLOSE:
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

    case API.MASTER_VAULT_ADD:
      try {
        await vaultsAdd(requestData?.key, requestData?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_FILE_ADD:
      try {
        const stream = req.createRequestStream()

        const { buffer, metaData } = await receiveFileStream(stream)

        await activeVaultAddFile(metaData.key, buffer)

        workletLogger.log({
          stream: `Received stream data of size: ${buffer.length}`,
          data: JSON.stringify(metaData)
        })

        req.reply(JSON.stringify({ success: true, metaData }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding file to active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_FILE_GET:
      try {
        const file = await activeVaultGetFile(requestData?.key)

        const stream = req.createResponseStream()

        sendFileStream({
          stream,
          buffer: file,
          metaData: { key: requestData?.key }
        })
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting file from active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_FILE_REMOVE:
      try {
        await activeVaultRemoveFile(requestData?.key)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error removing file from active vault: ${error}`
          })
        )
      }

      break

    case API.MASTER_VAULT_LIST:
      try {
        const vaults = await vaultsList(requestData?.filterKey)

        req.reply(JSON.stringify({ data: vaults }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error listing vaults: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_INIT:
      try {
        await initActiveVaultInstance(
          requestData?.id,
          requestData?.encryptionKey
        )

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error initializing active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_GET_STATUS:
      req.reply(JSON.stringify({ status: getIsActiveVaultInitialized() }))

      break

    case API.ACTIVE_VAULT_CLOSE:
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

    case API.ACTIVE_VAULT_ADD:
      try {
        await activeVaultAdd(requestData?.key, requestData?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding record to active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_REMOVE:
      try {
        await vaultRemove(requestData?.key)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error removing record from active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_LIST:
      try {
        const res = await activeVaultList(requestData?.filterKey)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error listing records from active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_GET:
      try {
        const res = await activeVaultGet(requestData?.key)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting records from active vault: ${error}`
          })
        )
      }

      break

    case API.ACTIVE_VAULT_CREATE_INVITE:
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

    case API.ACTIVE_VAULT_DELETE_INVITE:
      try {
        await deleteInvite()

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error deleting invite from active vault: ${error}`
          })
        )
      }

      break

    case API.PAIR_ACTIVE_VAULT:
      try {
        workletLogger.log('Pairing with invite code:', requestData.inviteCode)

        const { vaultId, encryptionKey } = await pairActiveVault(
          requestData.inviteCode
        )

        req.reply(JSON.stringify({ data: { vaultId, encryptionKey } }))

        workletLogger.log(
          'Pairing successful with invite code:',
          requestData.inviteCode,
          'Vault ID:',
          vaultId,
          'Encryption Key:',
          encryptionKey
        )
      } catch (error) {
        workletLogger.error('Error pairing with invite code:', error)

        req.reply(
          JSON.stringify({
            error: `Error pairing with invite code: ${error}`
          })
        )
      }

      break

    case API.CANCEL_PAIR_ACTIVE_VAULT:
      try {
        workletLogger.log('Canceling pairing with active vault')

        await cancelPairActiveVault()

        req.reply(JSON.stringify({ success: true }))

        workletLogger.log('Pairing with active vault canceled successfully')
      } catch (error) {
        workletLogger.error('Error canceling pairing with active vault:', error)

        req.reply(
          JSON.stringify({
            error: `Error canceling pairing with active vault: ${error}`
          })
        )
      }

      break

    case API.INIT_LISTENER:
      try {
        if (!getIsActiveVaultInitialized()) {
          throw new Error('Active vault not initialized')
        }

        const vaultId = requestData.vaultId

        await initListener({
          vaultId: vaultId,
          onUpdate: () => {
            const req = rpc.request(API.ON_UPDATE)

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

    case API.ENCRYPTION_INIT:
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

    case API.ENCRYPTION_GET_STATUS:
      req.reply(JSON.stringify({ status: getIsEncryptionInitialized() }))

      break

    case API.ENCRYPTION_GET:
      try {
        const res = await encryptionGet(requestData?.key)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getting encryption data: ${error}`
          })
        )
      }

      break

    case API.ENCRYPTION_ADD:
      try {
        await encryptionAdd(requestData?.key, requestData?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error adding encryption data: ${error}`
          })
        )
      }

      break

    case API.ENCRYPTION_HASH_PASSWORD:
      try {
        const res = hashPassword(requestData.password)

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error hashPassword: ${error}`
          })
        )
      }

      break

    case API.ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD:
      try {
        const res = encryptVaultKeyWithHashedPassword(
          requestData.hashedPassword
        )

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error encryptVaultKeyWithHashedPassword: ${error}`
          })
        )
      }

      break

    case API.ENCRYPTION_ENCRYPT_VAULT_WITH_KEY:
      try {
        const res = encryptVaultWithKey(
          requestData.hashedPassword,
          requestData.key
        )

        req.reply(JSON.stringify({ data: res }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error encryptVaultWithKey: ${error}`
          })
        )
      }

      break

    case API.ENCRYPTION_GET_DECRYPTION_KEY:
      try {
        const { salt, password } = requestData

        const hashedPassword = getDecryptionKey({
          password,
          salt
        })

        req.reply(JSON.stringify({ data: hashedPassword }))
      } catch (error) {
        req.reply(
          JSON.stringify({
            error: `Error getDecryptionKey: ${error}`
          })
        )
      }

      break

    case API.ENCRYPTION_DECRYPT_VAULT_KEY:
      try {
        const { ciphertext, nonce, hashedPassword } = requestData

        const res = decryptVaultKey({
          ciphertext,
          nonce,
          hashedPassword
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

    case API.ENCRYPTION_CLOSE:
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

    case API.CLOSE:
      try {
        await closeAllInstances()

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

const ipc = isPearWorker() ? Pear.worker.pipe() : BareKit.IPC

// eslint-disable-next-line no-undef
ipc.on('close', () => Bare.exit(0))

// eslint-disable-next-line no-undef
ipc.on('end', () => Bare.exit(0))

export const rpc = new RPC(new FramedStream(ipc), handleRpcCommand)
