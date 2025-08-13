jest.mock('bare-crypto', () => ({
  randomBytes: (n) => Buffer.alloc(n),
  createCipheriv: () => ({
    update: (data) => data,
    final: () => Buffer.alloc(0),
    getAuthTag: () => Buffer.alloc(16)
  }),
  createDecipheriv: () => ({
    update: (data) => data,
    final: () => Buffer.alloc(0),
    setAuthTag: jest.fn()
  })
}))

jest.mock('autopass', () => {
  const mockPair = {
    finished: jest.fn().mockResolvedValue({
      ready: jest.fn().mockResolvedValue(),
      close: jest.fn().mockResolvedValue(),
      add: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({ id: 'vault-id' }),
      createInvite: jest.fn().mockResolvedValue('invite-code'),
      encryptionKey: {
        toString: jest.fn().mockReturnValue('encryption-key')
      },
      list: jest.fn().mockResolvedValue({
        on: (event, callback) => {
          if (event === 'data') {
            callback({ key: 'test1', value: 1 })
            callback({ key: 'filter_test', value: 2 })
            callback({ key: 'test2', value: 3 })
          }
          if (event === 'end') {
            callback()
          }
        }
      }),
      removeAllListeners: jest.fn(),
      on: jest.fn()
    })
  }

  const mockAutopass = jest.fn().mockImplementation(() => ({
    ready: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    add: jest.fn().mockResolvedValue(),
    remove: jest.fn().mockResolvedValue(),
    get: jest.fn().mockResolvedValue(JSON.stringify({ id: 'vault-id' })),
    createInvite: jest.fn().mockResolvedValue('invite-code'),
    deleteInvite: jest.fn().mockResolvedValue(),
    encryptionKey: {
      toString: jest.fn().mockReturnValue('encryption-key')
    },
    list: jest.fn().mockResolvedValue({
      on: (event, callback) => {
        if (event === 'data') {
          callback({ key: 'test1', value: 1 })
          callback({ key: 'filter_test', value: 2 })
          callback({ key: 'test2', value: 3 })
        }
        if (event === 'end') {
          callback()
        }
      }
    }),
    removeAllListeners: jest.fn(),
    on: jest.fn(),
    pairInstance: jest.fn().mockResolvedValue()
  }))

  mockAutopass.pair = jest.fn().mockReturnValue(mockPair)

  return mockAutopass
})

jest.mock('corestore', () =>
  jest.fn().mockImplementation(() => ({
    ready: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    add: jest.fn().mockResolvedValue(),
    remove: jest.fn().mockResolvedValue(),
    get: jest.fn().mockResolvedValue({ id: 'vault-id' }),
    pairInstance: jest.fn().mockResolvedValue(),
    list: jest.fn().mockResolvedValue({
      on: (event, callback) => {
        if (event === 'data') {
          callback({ key: 'test1', value: 1 })
          callback({ key: 'other', value: 2 })
          callback({ key: 'test2', value: 3 })
        }
        if (event === 'end') {
          callback()
        }
      }
    })
  }))
)

jest.mock('bare-rpc', () =>
  jest.fn().mockImplementation(() => ({
    request: jest.fn().mockReturnValue({
      send: jest.fn().mockResolvedValue(),
      reply: jest.fn().mockResolvedValue('{}')
    })
  }))
)

jest.mock('bare-path', () => ({
  join: (...args) => args.join('/')
}))

jest.mock('./utils/isPearWorker', () => ({
  isPearWorker: jest.fn().mockReturnValue(false)
}))

import * as appDeps from './appDeps'

describe('appDeps module functions (excluding encryption)', () => {
  beforeEach(async () => {
    jest.resetModules()
  })

  describe('setStoragePath and buildPath', () => {
    test('buildPath should throw if STORAGE_PATH is not set', async () => {
      expect(() => appDeps.buildPath('vault/test')).toThrow(
        'Storage path not set'
      )
    })

    test('buildPath returns expected path after setStoragePath', async () => {
      await appDeps.setStoragePath('file://base')
      const result = appDeps.buildPath('vault/test')
      expect(result).toBe('base/vault/test')
    })
  })

  describe('State getters', () => {
    test('initially vaults, encryption, and active vault are not initialized', () => {
      expect(appDeps.getIsVaultsInitialized()).toBe(false)
      expect(appDeps.getIsEncryptionInitialized()).toBe(false)
      expect(appDeps.getIsActiveVaultInitialized()).toBe(false)
    })
  })

  describe('Vaults initialization and closing', () => {
    beforeEach(() => {
      jest.spyOn(appDeps, 'initInstance').mockResolvedValue(
        appDeps.__dummyInstance || {
          ready: jest.fn().mockResolvedValue(),
          close: jest.fn().mockResolvedValue(),
          add: jest.fn().mockResolvedValue()
        }
      )
    })
    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('vaultsInit sets vaultsInitialized to true', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.vaultsInit('any-password')
      expect(appDeps.getIsVaultsInitialized()).toBe(true)
    })

    test('closeVaultsInstance resets vaultsInitialized to false', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.vaultsInit('any-password')
      expect(appDeps.getIsVaultsInitialized()).toBe(true)
      await appDeps.closeVaultsInstance()
      expect(appDeps.getIsVaultsInitialized()).toBe(false)
    })
  })

  describe('Active vault functions', () => {
    beforeEach(() => {
      jest.spyOn(appDeps, 'initInstance').mockResolvedValue(
        appDeps.__dummyInstance || {
          ready: jest.fn().mockResolvedValue(),
          close: jest.fn().mockResolvedValue(),
          add: jest.fn().mockResolvedValue(),
          remove: jest.fn().mockResolvedValue(),
          get: jest.fn().mockResolvedValue({ id: 'vault-id' }),
          createInvite: jest.fn().mockResolvedValue('invite-code'),
          removeAllListeners: jest.fn(),
          on: jest.fn(),
          encryptionKey: jest.fn().mockResolvedValue('encryption-key')
        }
      )
    })
    afterEach(() => {
      jest.restoreAllMocks()
    })

    test('initActiveVaultInstance sets active vault as initialized', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1', 'password')
      expect(appDeps.getIsActiveVaultInitialized()).toBe(true)
    })

    test('closeActiveVaultInstance resets active vault initialization', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')
      expect(appDeps.getIsActiveVaultInitialized()).toBe(true)
      await appDeps.closeActiveVaultInstance()
      expect(appDeps.getIsActiveVaultInitialized()).toBe(false)
    })

    test('activeVaultAdd calls add on activeVaultInstance', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')

      const mockInstance = await appDeps.getActiveVaultInstance()

      mockInstance.add = jest.fn().mockResolvedValue()

      await appDeps.activeVaultAdd('key1', { data: 'test' })
      expect(mockInstance.add).toHaveBeenCalledWith(
        'key1',
        JSON.stringify({ data: 'test' })
      )
    })

    test('vaultsGet calls get on vaultInstance and returns result', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.vaultsInit('vault1')
      const result = await appDeps.vaultsGet('key4')
      expect(result).toEqual({ id: 'vault-id' })
    })

    test('vaultsAdd calls add on vaultsInstance', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.vaultsInit('any-password')

      const mockInstance = await appDeps.getVaultsInstance()

      mockInstance.add = jest.fn().mockResolvedValue()

      await appDeps.vaultsAdd('key2', { data: 'test' })
      expect(mockInstance.add).toHaveBeenCalledWith(
        'key2',
        JSON.stringify({ data: 'test' })
      )
    })

    test('vaultRemove calls remove on activeVaultInstance', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')

      const mockInstance = await appDeps.getActiveVaultInstance()

      mockInstance.remove = jest.fn().mockResolvedValue()

      await appDeps.vaultRemove('key3')
      expect(mockInstance.remove).toHaveBeenCalledWith('key3')
    })

    test('activeVaultGet calls get on activeVaultInstance and returns result', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')
      const result = await appDeps.activeVaultGet('key4')
      expect(result).toEqual({ id: 'vault-id' })
    })

    test('createInvite returns correct invite string', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')
      const result = await appDeps.createInvite()
      expect(result).toBe('vault-id/invite-code')
    })
  })

  describe('List functions (vaultsList and activeVaultList)', () => {
    const fakeListInstance = {
      list: jest.fn().mockResolvedValue({
        on: (event, callback) => {
          if (event === 'data') {
            callback({ key: 'test1', value: 1 })
            callback({ key: 'other', value: 2 })
            callback({ key: 'test2', value: 3 })
          }
          if (event === 'end') {
            callback()
          }
        }
      })
    }

    test('vaultsList returns filtered values based on filterKey', async () => {
      jest.spyOn(appDeps, 'initInstance').mockResolvedValue(fakeListInstance)
      await appDeps.setStoragePath('file://base')
      await appDeps.vaultsInit('any-password')
      const result = await appDeps.vaultsList('test')
      expect(result).toEqual([1, 3])
      appDeps.initInstance.mockRestore()
    })

    test('activeVaultList returns filtered values based on filterKey', async () => {
      jest.spyOn(appDeps, 'initInstance').mockResolvedValue(fakeListInstance)
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')
      const result = await appDeps.activeVaultList('test')
      expect(result).toEqual([1, 3])
      appDeps.initInstance.mockRestore()
    })
  })

  describe('Pairing functions', () => {
    test('pair calls pair with invite code and returns vault id', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.vaultsInit('any-password')
      const { vaultId, encryptionKey } = await appDeps.pair(
        'vault-id/invite-code'
      )
      expect(vaultId).toBe('vault-id')
      expect(encryptionKey).toBe('encryption-key')
    })
  })

  describe('initListener', () => {
    test('initListener should not reinitialize if vaultId matches previous value', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')
      const dummy = await appDeps.initInstance()
      dummy.removeAllListeners = jest.fn()
      dummy.on = jest.fn()
      await appDeps.initListener('vault1')
      expect(dummy.removeAllListeners).not.toHaveBeenCalled()
    })
  })

  describe('closeAllInstances', () => {
    beforeEach(() => {
      jest.spyOn(appDeps, 'initInstance').mockResolvedValue(
        appDeps.__dummyInstance || {
          ready: jest.fn().mockResolvedValue(),
          close: jest.fn().mockResolvedValue()
        }
      )
    })
    test('closeAllInstances closes all initialized instances', async () => {
      await appDeps.setStoragePath('file://base')
      await appDeps.initActiveVaultInstance('vault1')
      await appDeps.vaultsInit('vault1')
      await appDeps.encryptionInit('vault1')

      const activeVault = appDeps.getActiveVaultInstance()
      const vaults = appDeps.getVaultsInstance()
      const encryption = appDeps.getEncryptionInstance()

      const closeSpy1 = jest.spyOn(activeVault, 'close')
      const closeSpy2 = jest.spyOn(vaults, 'close')
      const closeSpy3 = jest.spyOn(encryption, 'close')

      await appDeps.closeAllInstances()

      expect(closeSpy1).toHaveBeenCalled()
      expect(closeSpy2).toHaveBeenCalled()
      expect(closeSpy3).toHaveBeenCalled()

      expect(appDeps.getIsActiveVaultInitialized()).toBe(false)
      expect(appDeps.getIsVaultsInitialized()).toBe(false)
      expect(appDeps.getIsEncryptionInitialized()).toBe(false)
    })
  })
})
