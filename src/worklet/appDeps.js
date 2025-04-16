import Autopass from 'autopass'
import Corestore from 'corestore'

let STORAGE_PATH = null

let encryptionInstance
let isEncryptionInitialized = false

let vaultsInstance
let isVaultsInitialized = false

let activeVaultInstance
let isActiveVaultInitialized = false

let listeningVaultId = null

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
 * @returns {Autopass}
 **/
export const getEncryptionInstance = () => encryptionInstance

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

  return instance.encryptionKey.toString('base64')
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

  const encryptionKey = await pairInstance(`vault/${vaultId}`, inviteKey)

  return encryptionKey
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
      const parsedValue = JSON.parse(value)

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

  const fullPath = STORAGE_PATH + '/' + path

  return fullPath.substring('file://'.length, fullPath.length)
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

  const instance = new Autopass(store, {
    encryptionKey: encryptionKey
      ? Buffer.from(encryptionKey, 'base64')
      : undefined
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

  const parsedRes = JSON.parse(res)

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

  await activeVaultInstance.add(key, JSON.stringify(data))
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

  const parsedRes = JSON.parse(res)

  return parsedRes
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
    filterKey ? (key) => key.startsWith(filterKey) : undefined
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
    filterKey ? (key) => key.startsWith(filterKey) : undefined
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

  const parsedRes = JSON.parse(res)

  return parsedRes
}

/**
 * @returns {Promise<string>}
 */
export const createInvite = async () => {
  const inviteCode = await activeVaultInstance.createInvite()

  const vault = await activeVaultInstance.get('vault')

  if (!vault) {
    throw new Error('Vault not found')
  }

  const parsedVault = JSON.parse(vault)

  const vaultId = parsedVault.id

  return `${vaultId}/${inviteCode}`
}

/**
 * @param {string} inviteCode
 * @returns {Promise<void>}
 */
export const pair = async (inviteCode) => {
  const [vaultId, inviteKey] = inviteCode.split('/')

  const encryptionKey = await pairActiveVaultInstance(vaultId, inviteKey)

  return { vaultId, encryptionKey }
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
}
