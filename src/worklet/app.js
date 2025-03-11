import Autopass from 'autopass'
import crypto from 'bare-crypto'
import RPC from 'bare-rpc'
import Corestore from 'corestore'
import sodium from 'sodium-native'

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
  ENCRYPTION_ADD
} from './api'

let STORAGE_PATH = null

let encryptionInstance
let isEncryptionInitialized = false

let vaultsInstance
let isVaultsInitialized = false

let activeVaultInstance
let isActiveVaultInitialized = false

let listeningVaultId = null

const iterations = 100000
const keyLength = 32

/**
 *
 * @param  {string} password
 * @returns {Promise<{
 *  salt: string
 *  iv: string
 *  tag: string
 *  encryptedKey: string
 * }>}
 */
export const encryptVaultKey = async (password) => {
  const vaultKey = crypto.randomBytes(16).toString('hex')

  const salt = crypto.randomBytes(16)

  const derivedKey = Buffer.alloc(keyLength)

  const passwordBuffer = Buffer.isBuffer(password)
    ? password
    : Buffer.from(password)

  await sodium.extension_pbkdf2_sha512(
    derivedKey,
    passwordBuffer,
    salt,
    iterations,
    keyLength
  )

  const iv = crypto.randomBytes(12) // AES-GCM IV

  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv)

  let encrypted = cipher.update(vaultKey)

  encrypted = Buffer.concat([encrypted, cipher.final()])

  const tag = cipher.getAuthTag()

  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    encryptedKey: encrypted.toString('hex')
  }
}

/**
 * @param {string} password
 * @param {{
 *  salt: string
 *  iv: string
 *  tag: string
 *  encryptedKey: string
 * }} encryptionData
 * @returns {Promise<Buffer>}
 */
export const decryptVaultKey = async (password, encryptionData) => {
  const { salt, iv, tag, encryptedKey } = encryptionData

  const derivedKey = Buffer.alloc(keyLength)

  const passwordBuffer = Buffer.isBuffer(password)
    ? password
    : Buffer.from(password)

  await sodium.extension_pbkdf2_sha512(
    derivedKey,
    passwordBuffer,
    Buffer.from(salt, 'hex'),
    iterations,
    keyLength
  )

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    derivedKey,
    Buffer.from(iv, 'hex')
  )

  decipher.setAuthTag(Buffer.from(tag, 'hex'))

  let decrypted = decipher.update(Buffer.from(encryptedKey, 'hex'))

  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted
}

/**
 * @param {string} path
 * @returns {Promise<Autopass>}
 */
export const pairInstance = async (path, invite) => {
  const fullPath = buildPath(path)

  const store = new Corestore(fullPath)

  if (!store) {
    throw new Error('Error creating store')
  }

  const pair = Autopass.pair(store, invite)

  const instance = await pair.finished()

  await instance.ready()

  await instance.close()
}

/**
 * @returns {Promise<void>}
 */
const closeActiveVaultInstance = async () => {
  activeVaultInstance.removeAllListeners()

  await activeVaultInstance.close()

  activeVaultInstance = null
  isActiveVaultInitialized = false
}

/**
 * @param {string} vaultId
 * @param {string} inviteKey
 * @returns {Promise<{id: string}>}
 */
export const pairActiveVaultInstance = async (vaultId, inviteKey) => {
  if (isActiveVaultInitialized) {
    await closeActiveVaultInstance()
  }

  await pairInstance(`vault/${vaultId}`, inviteKey)
}

/**
 *
 * @param {Autopass} instance
 * @param {Function} filterFn
 * @returns
 */
export const collectValuesByFilter = async (instance, filterFn) => {
  const stream = await instance.list()
  const results = []

  return new Promise((resolve, reject) => {
    stream.on('data', ({ key, value }) => {
      if (!filterFn) {
        results.push(value)
        return
      }

      if (filterFn(key)) {
        results.push(value)
      }
    })

    stream.on('end', () => resolve(results))

    stream.on('error', (error) => reject(error))
  })
}

/**
 * @param {string} path
 * @returns {string}
 */
const buildPath = (path) => {
  if (!STORAGE_PATH) {
    throw new Error('Storage path not set')
  }

  const fullPath = STORAGE_PATH + '/' + path

  return fullPath.substring('file://'.length, fullPath.length)
}

/**
 * @param {string} path
 * @returns {Promise<Autopass>}
 */
const initInstance = async (path, encryptionKey) => {
  const fullPath = buildPath(path)

  const store = new Corestore(fullPath)

  if (!store) {
    throw new Error('Error creating store')
  }

  const instance = new Autopass(store, {
    encryptionKey: encryptionKey
  })

  await instance.ready()

  return instance
}

/**
 * @param {string} id
 * @returns {Promise<Autopass>}
 */
const initActiveVaultInstance = async (id) => {
  isActiveVaultInitialized = false

  activeVaultInstance = await initInstance(`vault/${id}`)

  isActiveVaultInitialized = true

  return activeVaultInstance
}

/**
 * @returns {Promise<void>}
 */
const vaultsInit = async (password) => {
  isVaultsInitialized = false

  vaultsInstance = await initInstance(
    'vaults'
    //  password
    //'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef012345678'
  )

  isVaultsInitialized = true

  // TEMPORARY FOR TESTING
  const encryptionData = await encryptVaultKey(password)

  const decriptedData = await decryptVaultKey(password, encryptionData)

  return {
    encryptionData,
    decriptedData
  }
}

/**
 * @returns {Promise<void>}
 */
const encryptionInit = async () => {
  isEncryptionInitialized = false

  encryptionInstance = await initInstance('encryption')

  isEncryptionInitialized = true
}

/**
 * @param {string} key
 * @returns {Promise<any>}
 */
const encryptionGet = async (key) => {
  if (!isEncryptionInitialized) {
    throw new Error('Encryption not initialised')
  }

  const res = await encryptionInstance.get(key)

  return res
}

/**
 * @param {string} key
 * @param {any} data
 * @returns {Promise<void>}
 */
const encryptionAdd = async (key, data) => {
  if (!isEncryptionInitialized) {
    throw new Error('Encryption not initialised')
  }

  await encryptionInstance.add(key, data)
}

/**
 * @returns {Promise<void>}
 */
const closeVaultsInstance = async () => {
  await vaultsInstance.close()

  vaultsInstance = null
  isVaultsInitialized = false
}

/**
 * @param {{
 *  id: string,
 *  vaultId: string,
 * }} record
 * @returns {Promise<void>}
 */
const activeVaultAdd = async (key, data) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.add(key, data)
}

/**
 * @param {any} vault
 * @returns {Promise<void>}
 */
export const vaultsAdd = async (key, vault) => {
  if (!isVaultsInitialized) {
    throw new Error('Vault not initialised')
  }

  await vaultsInstance.add(key, vault)
}

/**
 * @param {string} recordId
 * @returns {Promise<void>}
 */
const vaultRemove = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.remove(key)
}

/**
 * @returns {Promise<Array<any>>}
 */
const vaultsList = async (filterKey) => {
  if (!isVaultsInitialized) {
    throw new Error('Vaults not initialised')
  }

  if (filterKey) {
    return collectValuesByFilter(vaultsInstance, (key) =>
      key.startsWith(filterKey)
    )
  }

  return collectValuesByFilter(vaultsInstance)
}

/**
 * @returns {Promise<Array<any>>}
 */
const activeVaultList = async (filterKey) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  if (filterKey) {
    return collectValuesByFilter(activeVaultInstance, (key) =>
      key.startsWith(filterKey)
    )
  }

  return collectValuesByFilter(activeVaultInstance)
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
const activeVaultGet = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  const res = await activeVaultInstance.get(key)

  return res
}

/**
 * @returns {Promise<string>}
 */
export const createInvite = async () => {
  const inviteCode = await activeVaultInstance.createInvite()

  const vault = await activeVaultInstance.get('vault')

  const vaultId = vault.id

  return `${vaultId}/${inviteCode}`
}

/**
 * @param {string} inviteCode
 * @returns {Promise<void>}
 */
export const pair = async (inviteCode) => {
  const [vaultId, inviteKey] = inviteCode.split('/')

  await pairActiveVaultInstance(vaultId, inviteKey)

  await initActiveVaultInstance(vaultId)

  const vault = await activeVaultInstance.get('vault')

  await vaultsInstance.add(`vault/${vaultId}`, vault)

  return vault
}

/**
 * @param {{
 *  vaultId: string
 *   onUpdate: () => void
 * }} options
 */
export const initListener = async ({ vaultId, onUpdate }) => {
  if (vaultId === listeningVaultId) {
    return
  }

  activeVaultInstance.removeAllListeners()

  activeVaultInstance.on('update', () => {
    onUpdate?.()
  })

  listeningVaultId = vaultId
}

export const rpc = new RPC(BareKit.IPC, async (req) => {
  const data = req?.data ? JSON.parse(req?.data) : undefined

  switch (req.command) {
    case STORAGE_PATH_SET:
      STORAGE_PATH = data?.path

      req.reply(JSON.stringify({ success: true }))

      break

    case VAULTS_INIT:
      try {
        if (!data.password) {
          throw new Error('Password is required')
        }

        const res = await vaultsInit(data.password)

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
      req.reply(JSON.stringify({ status: isVaultsInitialized }))

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
        await initActiveVaultInstance(data?.id)

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
      req.reply(JSON.stringify({ status: isActiveVaultInitialized }))

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
        if (!isActiveVaultInitialized) {
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
      req.reply(JSON.stringify({ status: isEncryptionInitialized }))

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

    default:
      req.reply(JSON.stringify({ error: 'Command not found' }))
  }
})
