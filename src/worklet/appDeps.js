import Autopass from 'autopass'
import crypto from 'bare-crypto'
import Corestore from 'corestore'
import sodium from 'sodium-native'

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
 * @param {string} path
 * @returns {Promise<void>}
 * */
export const setStoragePath = async (path) => {
  STORAGE_PATH = path
}

/**
 * @returns {boolean}
 **/
export const getIsVaultsInitialized = () => isVaultsInitialized

/**
 * @returns {boolean}
 **/
export const getIsEncryptionInitialized = () => isEncryptionInitialized

/**
 * @returns {boolean}
 **/
export const getIsActiveVaultInitialized = () => isActiveVaultInitialized

/**
 * @returns {Autopass}
 */
export const getActiveVaultInstance = () => activeVaultInstance

/**
 * @returns {Autopass}
 **/
export const getVaultsInstance = () => vaultsInstance

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
export const closeActiveVaultInstance = async () => {
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
export const buildPath = (path) => {
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
export const initInstance = async (path, encryptionKey) => {
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
export const initActiveVaultInstance = async (id) => {
  isActiveVaultInitialized = false

  activeVaultInstance = await initInstance(`vault/${id}`)

  isActiveVaultInitialized = true

  return activeVaultInstance
}

/**
 * @returns {Promise<void>}
 */
export const vaultsInit = async (password) => {
  isVaultsInitialized = false

  vaultsInstance = await initInstance(
    'vaults'
    //  password
    //'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef012345678'
  )

  isVaultsInitialized = true
}

/**
 * @returns {Promise<void>}
 */
export const encryptionInit = async () => {
  isEncryptionInitialized = false

  encryptionInstance = await initInstance('encryption')

  isEncryptionInitialized = true
}

/**
 * @param {string} key
 * @returns {Promise<any>}
 */
export const encryptionGet = async (key) => {
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
export const encryptionAdd = async (key, data) => {
  if (!isEncryptionInitialized) {
    throw new Error('Encryption not initialised')
  }

  await encryptionInstance.add(key, data)
}

/**
 * @returns {Promise<void>}
 */
export const encryptionClose = async () => {
  await encryptionInstance.close()

  encryptionInstance = null
  isEncryptionInitialized = false
}

/**
 * @returns {Promise<void>}
 */
export const closeVaultsInstance = async () => {
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
export const activeVaultAdd = async (key, data) => {
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
export const vaultRemove = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.remove(key)
}

/**
 * @returns {Promise<Array<any>>}
 */
export const vaultsList = async (filterKey) => {
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
export const activeVaultList = async (filterKey) => {
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
export const activeVaultGet = async (key) => {
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
