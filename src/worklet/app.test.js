import { API } from './api'
import { handleRpcCommand } from './app'
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
  pairActiveVault,
  initListener,
  encryptionInit,
  encryptionGet,
  encryptionAdd,
  getIsActiveVaultInitialized,
  vaultsGet,
  closeAllInstances,
  cancelPairActiveVault
} from './appDeps'
import { decryptVaultKey } from './decryptVaultKey'
import { encryptVaultKeyWithHashedPassword } from './encryptVaultKeyWithHashedPassword'
import { encryptVaultWithKey } from './encryptVaultWithKey'
import { getDecryptionKey } from './getDecryptionKey'
import { hashPassword } from './hashPassword'

jest.mock('./decryptVaultKey', () => ({
  decryptVaultKey: jest.fn()
}))
jest.mock('./getDecryptionKey', () => ({
  getDecryptionKey: jest.fn()
}))
jest.mock('./encryptVaultKeyWithHashedPassword', () => ({
  encryptVaultKeyWithHashedPassword: jest.fn()
}))
jest.mock('./encryptVaultWithKey', () => ({
  encryptVaultWithKey: jest.fn()
}))
jest.mock('./hashPassword', () => ({
  hashPassword: jest.fn()
}))
jest.mock('bare-rpc', () =>
  jest.fn().mockImplementation((ipc, callback) => ({
    _callback: callback,
    request: jest.fn()
  }))
)
jest.mock('framed-stream', () =>
  jest.fn().mockImplementation(() => ({
    create: jest.fn()
  }))
)
jest.mock('./utils/isPearWorker', () => ({
  isPearWorker: jest.fn().mockReturnValue(false)
}))
jest.mock('./utils/workletLogger', () => ({
  workletLogger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('./appDeps', () => ({
  vaultsInit: jest.fn().mockResolvedValue(true),
  setStoragePath: jest.fn(),
  encryptionClose: jest.fn().mockResolvedValue(),
  closeVaultsInstance: jest.fn().mockResolvedValue(),
  vaultsAdd: jest.fn().mockResolvedValue(),
  vaultsGet: jest.fn().mockResolvedValue({}),
  vaultsList: jest.fn().mockResolvedValue([]),
  activeVaultInit: jest.fn().mockResolvedValue(),
  activeVaultClose: jest.fn().mockResolvedValue(),
  activeVaultAdd: jest.fn().mockResolvedValue(),
  initActiveVaultInstance: jest.fn().mockResolvedValue(),
  closeActiveVaultInstance: jest.fn().mockResolvedValue(),
  vaultRemove: jest.fn().mockResolvedValue(),
  activeVaultList: jest.fn().mockResolvedValue([]),
  activeVaultGet: jest.fn().mockResolvedValue({}),
  createInvite: jest.fn().mockResolvedValue('invite-code'),
  pairActiveVault: jest.fn().mockResolvedValue({}),
  cancelPairActiveVault: jest.fn().mockResolvedValue(),
  initListener: jest.fn().mockResolvedValue(),
  encryptionInit: jest.fn().mockResolvedValue(),
  encryptionGet: jest.fn().mockResolvedValue({}),
  encryptionAdd: jest.fn().mockResolvedValue(),
  initInstance: jest.fn().mockResolvedValue(),
  buildPath: jest.fn().mockReturnValue('/test/path'),
  getIsVaultsInitialized: jest.fn().mockReturnValue(false),
  getIsActiveVaultInitialized: jest.fn().mockReturnValue(false),
  getIsEncryptionInitialized: jest.fn().mockReturnValue(false),
  closeAllInstances: jest.fn().mockResolvedValue()
}))

describe('RPC handler', () => {
  let mockRequest

  beforeAll(() => {
    global.BareKit = {
      IPC: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    mockRequest = {
      command: '',
      data: null,
      reply: jest.fn()
    }
  })

  test('should handle STORAGE_PATH_SET command', async () => {
    mockRequest.command = API.STORAGE_PATH_SET
    mockRequest.data = JSON.stringify({ path: '/test/path' })

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle MASTER_VAULT_INIT command with password', async () => {
    mockRequest.command = API.MASTER_VAULT_INIT
    mockRequest.data = JSON.stringify({ encryptionKey: 'testpassword' })

    await handleRpcCommand(mockRequest)

    expect(vaultsInit).toHaveBeenCalledWith('testpassword')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true, res: true })
    )
  })

  test('should handle MASTER_VAULT_INIT command without password', async () => {
    mockRequest.command = API.MASTER_VAULT_INIT
    mockRequest.data = JSON.stringify({})

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({
        error: 'Error initializing vaults: Error: Password is required'
      })
    )
  })

  test('should handle MASTER_VAULT_GET_STATUS command', async () => {
    mockRequest.command = API.MASTER_VAULT_GET_STATUS

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { status: false } })
    )
  })

  test('should handle MASTER_VAULT_GET command', async () => {
    mockRequest.command = API.MASTER_VAULT_GET
    mockRequest.data = JSON.stringify({ key: 'testKey' })
    vaultsGet.mockResolvedValueOnce({ test: 'data' })

    await handleRpcCommand(mockRequest)

    expect(vaultsGet).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { test: 'data' } })
    )
  })

  test('should handle MASTER_VAULT_CLOSE command', async () => {
    mockRequest.command = API.MASTER_VAULT_CLOSE

    await handleRpcCommand(mockRequest)

    expect(closeVaultsInstance).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle MASTER_VAULT_ADD command', async () => {
    mockRequest.command = API.MASTER_VAULT_ADD
    mockRequest.data = JSON.stringify({
      key: 'testKey',
      data: { test: 'data' }
    })

    await handleRpcCommand(mockRequest)

    expect(vaultsAdd).toHaveBeenCalledWith('testKey', { test: 'data' })
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle MASTER_VAULT_LIST command', async () => {
    mockRequest.command = API.MASTER_VAULT_LIST
    mockRequest.data = JSON.stringify({ filterKey: 'filter' })
    const data = [{ id: 1 }, { id: 2 }]

    vaultsList.mockResolvedValueOnce(data)

    await handleRpcCommand(mockRequest)

    expect(vaultsList).toHaveBeenCalledWith('filter')
    expect(mockRequest.reply).toHaveBeenCalledWith(JSON.stringify({ data }))
  })

  test('should handle ACTIVE_VAULT_INIT command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_INIT
    mockRequest.data = JSON.stringify({
      id: 'vault-id',
      encryptionKey: 'testpassword'
    })

    await handleRpcCommand(mockRequest)

    expect(initActiveVaultInstance).toHaveBeenCalledWith(
      'vault-id',
      'testpassword'
    )
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ACTIVE_VAULT_GET_STATUS command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_GET_STATUS
    getIsActiveVaultInitialized.mockReturnValueOnce(true)

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { status: true } })
    )
  })

  test('should handle ACTIVE_VAULT_CLOSE command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_CLOSE
    getIsActiveVaultInitialized.mockReturnValueOnce(true)

    await handleRpcCommand(mockRequest)

    expect(closeActiveVaultInstance).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ACTIVE_VAULT_ADD command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_ADD
    mockRequest.data = JSON.stringify({
      key: 'testKey',
      data: { test: 'data' }
    })

    await handleRpcCommand(mockRequest)

    expect(activeVaultAdd).toHaveBeenCalledWith('testKey', { test: 'data' })
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle unknown command', async () => {
    mockRequest.command = 'UNKNOWN_COMMAND'

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Unknown command: UNKNOWN_COMMAND' })
    )
  })

  test('should handle ACTIVE_VAULT_REMOVE command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_REMOVE
    mockRequest.data = JSON.stringify({ key: 'testKey' })

    await handleRpcCommand(mockRequest)

    expect(vaultRemove).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ACTIVE_VAULT_LIST command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_LIST
    mockRequest.data = JSON.stringify({ filterKey: 'filter' })
    activeVaultList.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])

    await handleRpcCommand(mockRequest)

    expect(activeVaultList).toHaveBeenCalledWith('filter')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: [{ id: 1 }, { id: 2 }] })
    )
  })

  test('should handle ACTIVE_VAULT_GET command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_GET
    mockRequest.data = JSON.stringify({ key: 'testKey' })
    activeVaultGet.mockResolvedValueOnce({ test: 'data' })

    await handleRpcCommand(mockRequest)

    expect(activeVaultGet).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { test: 'data' } })
    )
  })

  test('should handle ACTIVE_VAULT_CREATE_INVITE command', async () => {
    mockRequest.command = API.ACTIVE_VAULT_CREATE_INVITE
    createInvite.mockResolvedValueOnce('vault-id/invite-code')

    await handleRpcCommand(mockRequest)

    expect(createInvite).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: 'vault-id/invite-code' })
    )
  })

  test('should handle PAIR_ACTIVE_VAULT command', async () => {
    mockRequest.command = API.PAIR_ACTIVE_VAULT
    mockRequest.data = JSON.stringify({ inviteCode: 'vault-id/invite-code' })
    pairActiveVault.mockResolvedValueOnce({
      vaultId: 'vault-id',
      encryptionKey: 'key'
    })

    await handleRpcCommand(mockRequest)

    expect(pairActiveVault).toHaveBeenCalledWith('vault-id/invite-code')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { vaultId: 'vault-id', encryptionKey: 'key' } })
    )
  })

  test('should handle CANCEL_PAIR_ACTIVE_VAULT command', async () => {
    mockRequest.command = API.CANCEL_PAIR_ACTIVE_VAULT
    cancelPairActiveVault.mockResolvedValueOnce()

    await handleRpcCommand(mockRequest)

    expect(cancelPairActiveVault).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle INIT_LISTENER command', async () => {
    mockRequest.command = API.INIT_LISTENER
    mockRequest.data = JSON.stringify({ vaultId: 'vault-id' })
    getIsActiveVaultInitialized.mockReturnValueOnce(true)
    initListener.mockResolvedValueOnce()

    await handleRpcCommand(mockRequest)

    expect(initListener).toHaveBeenCalledWith({
      vaultId: 'vault-id',
      onUpdate: expect.any(Function)
    })
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ENCRYPTION_INIT command', async () => {
    mockRequest.command = API.ENCRYPTION_INIT

    await handleRpcCommand(mockRequest)

    expect(encryptionInit).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ENCRYPTION_GET_STATUS command', async () => {
    mockRequest.command = API.ENCRYPTION_GET_STATUS

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { status: false } })
    )
  })

  test('should handle ENCRYPTION_GET command', async () => {
    mockRequest.command = API.ENCRYPTION_GET
    mockRequest.data = JSON.stringify({ key: 'testKey' })
    encryptionGet.mockResolvedValueOnce({ test: 'data' })

    await handleRpcCommand(mockRequest)

    expect(encryptionGet).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { test: 'data' } })
    )
  })

  test('should handle ENCRYPTION_ADD command', async () => {
    mockRequest.command = API.ENCRYPTION_ADD
    mockRequest.data = JSON.stringify({
      key: 'testKey',
      data: { test: 'data' }
    })

    await handleRpcCommand(mockRequest)

    expect(encryptionAdd).toHaveBeenCalledWith('testKey', { test: 'data' })
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ENCRYPTION_CLOSE command', async () => {
    mockRequest.command = API.ENCRYPTION_CLOSE

    await handleRpcCommand(mockRequest)

    expect(encryptionClose).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD command', async () => {
    mockRequest.command = API.ENCRYPTION_ENCRYPT_VAULT_KEY_WITH_HASHED_PASSWORD
    mockRequest.data = JSON.stringify({ hashedPassword: 'testpassword' })

    const mockResponse = {
      cypherText: 'encrypted-key-data',
      nonce: 'nonce-data'
    }

    encryptVaultKeyWithHashedPassword.mockReturnValueOnce(mockResponse)

    await handleRpcCommand(mockRequest)

    expect(encryptVaultKeyWithHashedPassword).toHaveBeenCalledWith(
      'testpassword'
    )
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: mockResponse })
    )
  })

  test('should handle ENCRYPTION_ENCRYPT_VAULT_WITH_KEY command', async () => {
    mockRequest.command = API.ENCRYPTION_ENCRYPT_VAULT_WITH_KEY
    mockRequest.data = JSON.stringify({
      hashedPassword: 'hashedPassword',
      key: 'key'
    })

    const mockResponse = {
      cypherText: 'encrypted-vault-data',
      nonce: 'nonce-data'
    }

    encryptVaultWithKey.mockReturnValueOnce(mockResponse)

    await handleRpcCommand(mockRequest)

    expect(encryptVaultWithKey).toHaveBeenCalledWith('hashedPassword', 'key')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: mockResponse })
    )
  })

  test('should handle ENCRYPTION_HASH_PASSWORD command', async () => {
    mockRequest.command = API.ENCRYPTION_HASH_PASSWORD
    mockRequest.data = JSON.stringify({ password: 'testpassword' })

    hashPassword.mockReturnValueOnce('hashed-password')

    await handleRpcCommand(mockRequest)

    expect(hashPassword).toHaveBeenCalledWith('testpassword')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: 'hashed-password' })
    )
  })

  test('should handle ENCRYPTION_GET_DECRYPTION_KEY command', async () => {
    mockRequest.command = API.ENCRYPTION_GET_DECRYPTION_KEY
    mockRequest.data = JSON.stringify({
      password: 'encrypted-data',
      salt: 'nonce-data'
    })

    getDecryptionKey.mockReturnValueOnce('decrypted-key')

    await handleRpcCommand(mockRequest)

    expect(getDecryptionKey).toHaveBeenCalledWith({
      password: 'encrypted-data',
      salt: 'nonce-data'
    })
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: 'decrypted-key' })
    )
  })

  test('should handle ENCRYPTION_DECRYPT_VAULT_KEY command', async () => {
    mockRequest.command = API.ENCRYPTION_DECRYPT_VAULT_KEY
    mockRequest.data = JSON.stringify({
      ciphertext: 'encrypted-data',
      nonce: 'nonce-data',
      hashedPassword: 'decryption-key-data'
    })

    decryptVaultKey.mockReturnValueOnce('decrypted-key')

    await handleRpcCommand(mockRequest)

    expect(decryptVaultKey).toHaveBeenCalledWith({
      ciphertext: 'encrypted-data',
      nonce: 'nonce-data',
      hashedPassword: 'decryption-key-data'
    })
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: 'decrypted-key' })
    )
  })

  test('should handle error in ENCRYPTION_DECRYPT_VAULT_KEY command', async () => {
    mockRequest.command = API.ENCRYPTION_DECRYPT_VAULT_KEY
    mockRequest.data = JSON.stringify({
      encryptedKey: 'encrypted-data',
      password: 'testpassword'
    })

    decryptVaultKey.mockImplementationOnce(() => {
      throw new Error('Decryption failed')
    })

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({
        error: 'Error decrypting vault key: Error: Decryption failed'
      })
    )
  })

  test('should handle CLOSE_ALL_INSTANCES command', async () => {
    mockRequest.command = API.CLOSE_ALL_INSTANCES

    await handleRpcCommand(mockRequest)

    expect(closeAllInstances).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle error in CLOSE_ALL_INSTANCES command', async () => {
    const errorMessage = 'Something went wrong'
    closeAllInstances.mockRejectedValueOnce(new Error(errorMessage))

    mockRequest.command = API.CLOSE_ALL_INSTANCES

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({
        error: `Error closing encryption: Error: ${errorMessage}`
      })
    )
  })
})
