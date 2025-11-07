import Autopass from 'autopass'
import barePath from 'bare-path'
import Corestore from 'corestore'
import Swarmconf from '@tetherto/swarmconf'

import { PearPassPairer } from './pearpassPairer'
import { defaultMirrorKeys } from '../constants/defaultBlindMirrors'
import { isPearWorker } from './utils/isPearWorker'

let STORAGE_PATH = null

let encryptionInstance
let isEncryptionInitialized = false

let vaultsInstance
let isVaultsInitialized = false

let activeVaultInstance
let isActiveVaultInitialized = false

let listeningVaultId = null
let lastActiveVaultId = null
let lastActiveVaultEncryptionKey = null
let lastOnUpdateCallback = null

const pearpassPairer = new PearPassPairer()

/**
 * @param {string} path
 * @returns {Promise<void>}
 * */
export const setStoragePath = async (path) => {
  STORAGE_PATH = isPearWorker()
    ? path
    : path.substring('file://'.length, path.length)
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
 * @returns {Autopass}
 **/
export const getEncryptionInstance = () => encryptionInstance

/**
 * @returns {void}
 */
const clearRestartCache = () => {
  lastActiveVaultId = null
  lastActiveVaultEncryptionKey = null
  lastOnUpdateCallback = null
}

/**
 * @param {{ clearRestartCache?: boolean }} [options]
 * @returns {Promise<void>}
 */
export const closeActiveVaultInstance = async (options) => {
  activeVaultInstance.removeAllListeners()

  await activeVaultInstance.close()

  activeVaultInstance = null
  isActiveVaultInitialized = false
  // reset listener marker so future initListener can rebind
  listeningVaultId = null

  if (options?.clearRestartCache) {
    clearRestartCache()
  }
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
      if (!value) {
        return
      }

      const parsedValue = JSON.parse(value)

      if (!parsedValue) {
        return
      }

      if (!filterFn) {
        results.push(parsedValue)
        return
      }

      if (filterFn(key)) {
        results.push(parsedValue)
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

  return barePath.join(STORAGE_PATH, path)
}

/**
 * @param {string} path
 * @param {string | undefined} encryptionKey
 * @returns {Promise<Autopass>}
 */
export const initInstance = async (path, encryptionKey) => {
  const fullPath = buildPath(path)

  const store = new Corestore(fullPath)

  if (!store) {
    throw new Error('Error creating store')
  }

  const conf = new Swarmconf(store)
  await conf.ready()

  const instance = new Autopass(store, {
    encryptionKey: encryptionKey
      ? Buffer.from(encryptionKey, 'base64')
      : undefined,
    relayThrough: conf.current.blindRelays
  })

  await instance.ready()

  return instance
}

/**
 * @param {string} id
 * @param {string | undefined} encryptionKey
 * @returns {Promise<Autopass>}
 */
export const initActiveVaultInstance = async (id, encryptionKey) => {
  isActiveVaultInitialized = false

  activeVaultInstance = await initInstance(`vault/${id}`, encryptionKey)

  isActiveVaultInitialized = true

  // cache last init params for restart
  lastActiveVaultId = id
  lastActiveVaultEncryptionKey = encryptionKey

  return activeVaultInstance
}

/**
 * @param {string | undefined} encryptionKey
 * @returns {Promise<void>}
 */
export const vaultsInit = async (encryptionKey) => {
  isVaultsInitialized = false

  vaultsInstance = await initInstance('vaults', encryptionKey)

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
  const { value } = res || {}
  const parsedRes = value ? JSON.parse(value) : null

  return parsedRes
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

  await encryptionInstance.add(key, JSON.stringify(data))
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
 * @param {string} key
 * @param {any} data
 * @param {Buffer} file
 * @returns {Promise<void>}
 */
export const activeVaultAdd = async (key, data, file) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.add(key, JSON.stringify(data), file)
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export const vaultsGet = async (key) => {
  if (!isVaultsInitialized) {
    throw new Error('Vaults not initialised')
  }

  const res = await vaultsInstance.get(key)

  const { value, file } = res || {}
  const parsedValue = JSON.parse(value)

  if (file) {
    Object.defineProperty(parsedValue, 'file', {
      value: file,
      enumerable: true
    })
  }
  return parsedValue
}

/**
 * @param {string} key
 * @param {any} data
 * @returns {Promise<void>}
 */
export const vaultsAdd = async (key, data) => {
  if (!isVaultsInitialized) {
    throw new Error('Vault not initialised')
  }

  await vaultsInstance.add(key, JSON.stringify(data))
}

/**
 * @param {string} key
 * @returns {Promise<Buffer|null>}
 */
export const activeVaultGetFile = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  const res = await activeVaultInstance.get(key)
  return res?.file || null
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export const activeVaultRemoveFile = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.remove(key)
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

  return collectValuesByFilter(
    vaultsInstance,
    filterKey ? (key) => key?.startsWith(filterKey) : undefined
  )
}

/**
 * @returns {Promise<Array<any>>}
 */
export const activeVaultList = async (filterKey) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  return collectValuesByFilter(
    activeVaultInstance,
    filterKey ? (key) => key?.startsWith(filterKey) : undefined
  )
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

  const { value, file } = res || {}
  const parsedValue = JSON.parse(value)

  if (file) {
    Object.defineProperty(parsedValue, 'file', {
      value: file,
      enumerable: true
    })
  }
  return parsedValue
}

/**
 * @returns {Promise<string>}
 */
export const createInvite = async () => {
  await activeVaultInstance.deleteInvite()
  const inviteCode = await activeVaultInstance.createInvite()

  const response = await activeVaultInstance.get('vault')
  const { value: vault } = response || {}
  if (!vault) {
    throw new Error('Vault not found')
  }

  const parsedVault = JSON.parse(vault)

  const vaultId = parsedVault.id

  return `${vaultId}/${inviteCode}`
}

/**
 * @returns {Promise<void>}
 */
export const deleteInvite = async () => {
  await activeVaultInstance.deleteInvite()

  const response = await activeVaultInstance.get('vault')
  const { value: vault } = response || {}

  if (!vault) {
    throw new Error('Vault not found')
  }
}

/**
 * @param {string} inviteCode
 * @returns {Promise<{ vaultId: string, encryptionKey: string }>}
 */
export const pairActiveVault = async (inviteCode) => {
  const [vaultId, inviteKey] = inviteCode.split('/')

  if (isActiveVaultInitialized) {
    await closeActiveVaultInstance()
  }

  try {
    const encryptionKey = await pearpassPairer.pairInstance(
      buildPath(`vault/${vaultId}`),
      inviteKey
    )

    return { vaultId, encryptionKey }
  } catch (error) {
    throw new Error(`Pairing failed: ${error.message}`)
  }
}

export const cancelPairActiveVault = async () => {
  await pearpassPairer.cancelPairing()
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
  lastOnUpdateCallback = onUpdate
}

/**
 * @returns {Promise<void>}
 */
export const restartActiveVault = async () => {
  if (!lastActiveVaultId) {
    throw new Error('[restartActiveVault]: No previous active vault to restart')
  }

  if (isActiveVaultInitialized) {
    await closeActiveVaultInstance()
  }

  await initActiveVaultInstance(lastActiveVaultId, lastActiveVaultEncryptionKey)

  if (lastOnUpdateCallback) {
    await initListener({
      vaultId: lastActiveVaultId,
      onUpdate: lastOnUpdateCallback
    })
  }
}

/**
 * @returns {Promise<void>}
 */
export const closeAllInstances = async () => {
  const closeTasks = []

  if (isActiveVaultInitialized) {
    closeTasks.push(closeActiveVaultInstance())
  }

  if (isVaultsInitialized) {
    closeTasks.push(closeVaultsInstance())
  }

  if (isEncryptionInitialized) {
    closeTasks.push(encryptionClose())
  }

  await Promise.all(closeTasks)
  clearRestartCache()
}

/**
 * Blind mirrors management
 */

/**
 * @returns {Promise<Array<string>>}
 */
export const getBlindMirrors = async () => {
  if (!isActiveVaultInitialized) {
    throw new Error('[getBlindMirrors]: Vault not initialised')
  }

  const mirrors = await activeVaultInstance.getMirror()
  return Array.isArray(mirrors) ? mirrors : []
}

/**
 * @param {Array<string>} mirrors
 * @returns {Promise<void>}
 */
export const addBlindMirrors = async (mirrors) => {
  if (!isActiveVaultInitialized) {
    throw new Error('[addBlindMirrors]: Vault not initialised')
  }

  if (!Array.isArray(mirrors) || mirrors.length === 0) {
    throw new Error('[addBlindMirrors]: No mirrors provided')
  }

  await Promise.all(
    mirrors.map((mirror) => activeVaultInstance.addMirror(mirror))
  )
}

/**
 * @returns {Promise<void>}
 */
export const removeBlindMirror = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('[removeBlindMirror]: Vault not initialised')
  }

  if (!key) {
    throw new Error('[removeBlindMirror]: mirror key not provided!')
  }

  await activeVaultInstance.removeMirror(key)
}

/**
 * @returns {Promise<void>}
 */
export const addDefaultBlindMirrors = async () => {
  if (!isActiveVaultInitialized) {
    throw new Error('[addDefaultBlindMirrors]: Vault not initialised')
  }

  await Promise.all(
    defaultMirrorKeys.map((key) => activeVaultInstance.addMirror(key))
  )
}

/**
 * Remove all blind mirrors from the active vault
 * @returns {Promise<void>}
 */
export const removeAllBlindMirrors = async () => {
  if (!isActiveVaultInitialized) {
    throw new Error('[removeAllBlindMirrors]: Vault not initialised')
  }

  const currentMirrors = await activeVaultInstance.getMirror()
  const currentKeys = (Array.isArray(currentMirrors) ? currentMirrors : []).map(
    (m) => m?.key
  )

  await Promise.all(
    currentKeys.map((key) => activeVaultInstance.removeMirror(key))
  )
}
