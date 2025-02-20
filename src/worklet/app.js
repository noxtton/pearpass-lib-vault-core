import Autopass from 'autopass'
import RPC from 'bare-rpc'
import Corestore from 'corestore'

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
  ACTIVE_VAULT_GET_STATUS
} from './api'

let STORAGE_PATH = null

let vaultsInstance
let isVaultsInitialized = false

let activeVaultInstance
let isActiveVaultInitialized = false

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
 * @returns {Promise<void>}
 */
const closeActiveVaultInstance = async () => {
  await activeVaultInstance?.close?.()

  isActiveVaultInitialized = false
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
 * @param {string} path
 * @returns {Promise<Autopass>}
 */
const initInstance = async (path) => {
  const fullPath = buildPath(path)

  const store = new Corestore(fullPath)

  if (!store) {
    throw new Error('Error creating store')
  }

  const instance = new Autopass(store)

  await instance.ready()

  return instance
}

/**
 * @param {string} path
 * @returns {Promise<void>}
 */
const vaultsInit = async () => {
  isVaultsInitialized = false

  vaultsInstance = await initInstance('vaults')

  isVaultsInitialized = true
}

/**
 * @returns {Promise<void>}
 */
const closeVaultsInstance = async () => {
  await vaultsInstance?.close?.()
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
export const vaultAdd = async (vault) => {
  if (!isVaultsInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.add(`vault`, vault)
}

/**
 * @param {string} recordId
 * @returns {Promise<void>}
 */
const vaultRemove = async (recordId) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.remove(`record/${recordId}`)
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
const activeVaultget = async (key) => {
  if (!isActiveVaultInitialized) {
    throw new Error('Vault not initialised')
  }

  await activeVaultInstance.get(key)
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
        await vaultsInit()

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error initializing vaults:', error)
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
        console.error('Error closing vaults:', error)
      }

      break

    case VAULTS_ADD:
      try {
        await vaultAdd(data?.vault)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error adding vault:', error)
      }

      break

    case VAULTS_LIST:
      try {
        const vaults = await vaultsList(data?.filterKey)

        req.reply(JSON.stringify({ vaults }))
      } catch (error) {
        console.error('Error listing vaults:', error)
      }

      break

    case ACTIVE_VAULT_INIT:
      try {
        await initActiveVaultInstance(data?.id)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error initializing active vault:', error)
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
        console.error('Error closing active vault:', error)
      }

      break

    case ACTIVE_VAULT_ADD:
      try {
        await activeVaultAdd(data?.key, data?.data)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error adding record to active vault:', error)
      }

      break

    case ACTIVE_VAULT_REMOVE:
      try {
        await vaultRemove(data?.recordId)

        req.reply(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error removing record from active vault:', error)
      }

      break

    case ACTIVE_VAULT_LIST:
      try {
        const data = await activeVaultList(data?.filterKey)

        req.reply(JSON.stringify({ data }))
      } catch (error) {
        console.error('Error listing records from active vault:', error)
      }

      break

    case ACTIVE_VAULT_GET:
      try {
        const data = await activeVaultget(data?.key)

        req.reply(JSON.stringify({ data }))
      } catch (error) {
        console.error('Error getting records from active vault:', error)
      }

      break

    default:
      req.reply(JSON.stringify({ error: 'Command not found' }))
  }
})
