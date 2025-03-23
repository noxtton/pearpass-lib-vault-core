import {
  STORAGE_PATH_SET,
  VAULTS_INIT,
  VAULTS_GET_STATUS,
  VAULTS_CLOSE,
  VAULTS_ADD,
  VAULTS_LIST,
  ACTIVE_VAULT_INIT,
  ACTIVE_VAULT_GET_STATUS,
  ACTIVE_VAULT_CLOSE,
  ACTIVE_VAULT_ADD,
  ACTIVE_VAULT_REMOVE,
  ACTIVE_VAULT_LIST,
  ACTIVE_VAULT_GET,
  ACTIVE_VAULT_CREATE_INVITE,
  PAIR,
  INIT_LISTENER,
  ENCRYPTION_INIT,
  ENCRYPTION_GET_STATUS,
  ENCRYPTION_GET,
  ENCRYPTION_ADD,
  ENCRYPTION_CLOSE
} from './api'
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
  pair,
  initListener,
  encryptionInit,
  encryptionGet,
  encryptionAdd,
  getIsActiveVaultInitialized
} from './appDeps'

jest.mock('bare-rpc', () => {
  return jest.fn().mockImplementation((ipc, callback) => {
    return {
      _callback: callback,
      request: jest.fn()
    }
  })
})
jest.mock('./appDeps', () => {
  return {
    vaultsInit: jest.fn().mockResolvedValue(true),
    setStoragePath: jest.fn(),
    encryptionClose: jest.fn().mockResolvedValue(),
    closeVaultsInstance: jest.fn().mockResolvedValue(),
    vaultsAdd: jest.fn().mockResolvedValue(),
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
    pair: jest.fn().mockResolvedValue({}),
    initListener: jest.fn().mockResolvedValue(),
    encryptionInit: jest.fn().mockResolvedValue(),
    encryptionGet: jest.fn().mockResolvedValue({}),
    encryptionAdd: jest.fn().mockResolvedValue(),
    initInstance: jest.fn().mockResolvedValue(),
    buildPath: jest.fn().mockReturnValue('/test/path'),
    getIsVaultsInitialized: jest.fn().mockReturnValue(false),
    getIsActiveVaultInitialized: jest.fn().mockReturnValue(false),
    getIsEncryptionInitialized: jest.fn().mockReturnValue(false)
  }
})

describe('RPC handler', () => {
  let mockRequest

  beforeAll(() => {
    global.BareKit = {
      IPC: {}
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      command: '',
      data: null,
      reply: jest.fn()
    }
  })

  test('should handle STORAGE_PATH_SET command', async () => {
    mockRequest.command = STORAGE_PATH_SET
    mockRequest.data = JSON.stringify({ path: '/test/path' })

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle VAULTS_INIT command with password', async () => {
    mockRequest.command = VAULTS_INIT
    mockRequest.data = JSON.stringify({ password: 'testpassword' })

    await handleRpcCommand(mockRequest)

    expect(vaultsInit).toHaveBeenCalledWith('testpassword')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true, res: true })
    )
  })

  test('should handle VAULTS_INIT command without password', async () => {
    mockRequest.command = VAULTS_INIT
    mockRequest.data = JSON.stringify({})

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({
        error: 'Error initializing vaults: Error: Password is required'
      })
    )
  })

  test('should handle VAULTS_GET_STATUS command', async () => {
    mockRequest.command = VAULTS_GET_STATUS

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ status: false })
    )
  })

  test('should handle VAULTS_CLOSE command', async () => {
    mockRequest.command = VAULTS_CLOSE

    await handleRpcCommand(mockRequest)

    expect(closeVaultsInstance).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle VAULTS_ADD command', async () => {
    mockRequest.command = VAULTS_ADD
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

  test('should handle VAULTS_LIST command', async () => {
    mockRequest.command = VAULTS_LIST
    mockRequest.data = JSON.stringify({ filterKey: 'filter' })
    const data = [{ id: 1 }, { id: 2 }]

    vaultsList.mockResolvedValueOnce(data)

    await handleRpcCommand(mockRequest)

    expect(vaultsList).toHaveBeenCalledWith('filter')
    expect(mockRequest.reply).toHaveBeenCalledWith(JSON.stringify({ data }))
  })

  test('should handle ACTIVE_VAULT_INIT command', async () => {
    mockRequest.command = ACTIVE_VAULT_INIT
    mockRequest.data = JSON.stringify({ id: 'vault-id' })

    await handleRpcCommand(mockRequest)

    expect(initActiveVaultInstance).toHaveBeenCalledWith('vault-id')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ACTIVE_VAULT_GET_STATUS command', async () => {
    mockRequest.command = ACTIVE_VAULT_GET_STATUS
    getIsActiveVaultInitialized.mockReturnValueOnce(true)

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ status: true })
    )
  })

  test('should handle ACTIVE_VAULT_CLOSE command', async () => {
    mockRequest.command = ACTIVE_VAULT_CLOSE
    getIsActiveVaultInitialized.mockReturnValueOnce(true)

    await handleRpcCommand(mockRequest)

    expect(closeActiveVaultInstance).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ACTIVE_VAULT_ADD command', async () => {
    mockRequest.command = ACTIVE_VAULT_ADD
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
      JSON.stringify({ error: 'Command not found' })
    )
  })

  test('should handle ACTIVE_VAULT_REMOVE command', async () => {
    mockRequest.command = ACTIVE_VAULT_REMOVE
    mockRequest.data = JSON.stringify({ key: 'testKey' })

    await handleRpcCommand(mockRequest)

    expect(vaultRemove).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ACTIVE_VAULT_LIST command', async () => {
    mockRequest.command = ACTIVE_VAULT_LIST
    mockRequest.data = JSON.stringify({ filterKey: 'filter' })
    activeVaultList.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])

    await handleRpcCommand(mockRequest)

    expect(activeVaultList).toHaveBeenCalledWith('filter')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: [{ id: 1 }, { id: 2 }] })
    )
  })

  test('should handle ACTIVE_VAULT_GET command', async () => {
    mockRequest.command = ACTIVE_VAULT_GET
    mockRequest.data = JSON.stringify({ key: 'testKey' })
    activeVaultGet.mockResolvedValueOnce({ test: 'data' })

    await handleRpcCommand(mockRequest)

    expect(activeVaultGet).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { test: 'data' } })
    )
  })

  test('should handle ACTIVE_VAULT_CREATE_INVITE command', async () => {
    mockRequest.command = ACTIVE_VAULT_CREATE_INVITE
    createInvite.mockResolvedValueOnce('vault-id/invite-code')

    await handleRpcCommand(mockRequest)

    expect(createInvite).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: 'vault-id/invite-code' })
    )
  })

  test('should handle PAIR command', async () => {
    mockRequest.command = PAIR
    mockRequest.data = JSON.stringify({ inviteCode: 'vault-id/invite-code' })
    pair.mockResolvedValueOnce({ id: 'vault-id' })

    await handleRpcCommand(mockRequest)

    expect(pair).toHaveBeenCalledWith('vault-id/invite-code')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { id: 'vault-id' } })
    )
  })

  test('should handle INIT_LISTENER command', async () => {
    mockRequest.command = INIT_LISTENER
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
    mockRequest.command = ENCRYPTION_INIT

    await handleRpcCommand(mockRequest)

    expect(encryptionInit).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })

  test('should handle ENCRYPTION_GET_STATUS command', async () => {
    mockRequest.command = ENCRYPTION_GET_STATUS

    await handleRpcCommand(mockRequest)

    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ status: false })
    )
  })

  test('should handle ENCRYPTION_GET command', async () => {
    mockRequest.command = ENCRYPTION_GET
    mockRequest.data = JSON.stringify({ key: 'testKey' })
    encryptionGet.mockResolvedValueOnce({ test: 'data' })

    await handleRpcCommand(mockRequest)

    expect(encryptionGet).toHaveBeenCalledWith('testKey')
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ data: { test: 'data' } })
    )
  })

  test('should handle ENCRYPTION_ADD command', async () => {
    mockRequest.command = ENCRYPTION_ADD
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
    mockRequest.command = ENCRYPTION_CLOSE

    await handleRpcCommand(mockRequest)

    expect(encryptionClose).toHaveBeenCalled()
    expect(mockRequest.reply).toHaveBeenCalledWith(
      JSON.stringify({ success: true })
    )
  })
})
