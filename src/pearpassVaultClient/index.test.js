import { PearpassVaultClient } from './index'
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
  ENCRYPTION_CLOSE,
  ON_UPDATE,
  ENCRYPTION_ENCRYPT_VAULT_KEY
} from '../worklet/api'

jest.mock('bare-rpc', () => {
  return jest.fn().mockImplementation((ipc, callback) => {
    return {
      IPC: ipc,
      _callback: callback,
      request: jest.fn()
    }
  })
})

describe('PearpassVaultClient', () => {
  let client, fakeWorklet

  beforeEach(() => {
    fakeWorklet = { IPC: {} }
    client = new PearpassVaultClient(fakeWorklet, '/dummy/storage/path')
    client.rpc.request.mockClear()
  })

  describe('setStoragePath', () => {
    it('should call STORAGE_PATH_SET request with the correct payload', async () => {
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('ok')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.setStoragePath('/new/path')

      expect(client.rpc.request).toHaveBeenCalledWith(STORAGE_PATH_SET)
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ path: '/new/path' })
      )
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('vaultsInit', () => {
    it('should initialize vaults successfully', async () => {
      const encryptionKey = 'secret'
      const mockSend = jest.fn().mockResolvedValue()
      const replyData = JSON.stringify({})
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await expect(client.vaultsInit(encryptionKey)).resolves.toBeUndefined()
      expect(client.rpc.request).toHaveBeenCalledWith(VAULTS_INIT)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ encryptionKey }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })

    it('should throw an error when vaultsInit returns an ELOCKED error', async () => {
      const password = 'secret'
      const errorReply = JSON.stringify({ error: 'ELOCKED' })
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(errorReply)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await expect(client.vaultsInit(password)).rejects.toThrow('ELOCKED')
    })
  })

  describe('vaultsGetStatus', () => {
    it('should return parsed vaults status', async () => {
      const statusObj = { status: 'ok' }
      const replyData = JSON.stringify(statusObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.vaultsGetStatus()
      expect(client.rpc.request).toHaveBeenCalledWith(VAULTS_GET_STATUS)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(statusObj)
    })
  })

  describe('vaultsClose', () => {
    it('should close vaults', async () => {
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('closed')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.vaultsClose()
      expect(client.rpc.request).toHaveBeenCalledWith(VAULTS_CLOSE)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('vaultsAdd', () => {
    it('should add vault data', async () => {
      const key = 'key1'
      const vaultData = { foo: 'bar' }
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('added')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.vaultsAdd(key, vaultData)
      expect(client.rpc.request).toHaveBeenCalledWith(VAULTS_ADD)
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ key, data: vaultData })
      )
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('vaultsList', () => {
    it('should list vaults and return data', async () => {
      const filterKey = 'filter'
      const data = ['vault1', 'vault2']
      const replyData = JSON.stringify({ data })
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.vaultsList(filterKey)
      expect(client.rpc.request).toHaveBeenCalledWith(VAULTS_LIST)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ filterKey }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(data)
    })
  })

  describe('activeVaultInit', () => {
    it('should initialize active vault and return parsed response', async () => {
      const id = 'vault123'
      const responseObj = { id, initialized: true }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.activeVaultInit({ id })
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_INIT)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ id }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj)
    })

    it('should initialize active vault with encryptionKey', async () => {
      const id = 'vault123'
      const encryptionKey = 'encryptionKey123'
      const responseObj = { id, initialized: true }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })
      const result = await client.activeVaultInit({ id, encryptionKey })
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_INIT)
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ id, encryptionKey })
      )
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj)
    })
  })

  describe('activeVaultGetStatus', () => {
    it('should get active vault status', async () => {
      const statusObj = { status: 'active' }
      const replyData = JSON.stringify(statusObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.activeVaultGetStatus()
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_GET_STATUS)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(statusObj)
    })
  })

  describe('activeVaultClose', () => {
    it('should close active vault', async () => {
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('closed')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.activeVaultClose()
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_CLOSE)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('activeVaultAdd', () => {
    it('should add data to active vault', async () => {
      const key = 'key1'
      const data = { value: 'data' }
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('added')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.activeVaultAdd(key, data)
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_ADD)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ key, data }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('activeVaultRemove', () => {
    it('should remove data from active vault', async () => {
      const key = 'key1'
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('removed')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.activeVaultRemove(key)
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_REMOVE)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ key }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('activeVaultList', () => {
    it('should list active vaults and return data', async () => {
      const filterKey = 'filter'
      const data = ['activeVault1', 'activeVault2']
      const replyData = JSON.stringify({ data })
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.activeVaultList(filterKey)
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_LIST)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ filterKey }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(data)
    })
  })

  describe('activeVaultGet', () => {
    it('should get active vault data', async () => {
      const key = 'key1'
      const responseObj = { data: { foo: 'bar' } }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.activeVaultGet(key)
      expect(client.rpc.request).toHaveBeenCalledWith(ACTIVE_VAULT_GET)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ key }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj.data)
    })
  })

  describe('activeVaultCreateInvite', () => {
    it('should create an invite and return the invite data', async () => {
      const responseObj = { data: 'invite-code' }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.activeVaultCreateInvite()
      expect(client.rpc.request).toHaveBeenCalledWith(
        ACTIVE_VAULT_CREATE_INVITE
      )
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj.data)
    })
  })

  describe('pair', () => {
    it('should pair using an invite code and return paired data', async () => {
      const inviteCode = 'INV123'
      const responseObj = { data: 'paired-data' }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.pair(inviteCode)
      expect(client.rpc.request).toHaveBeenCalledWith(PAIR)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ inviteCode }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj.data)
    })
  })

  describe('initListener', () => {
    it('should initialize listener and return success', async () => {
      const vaultId = 'vault1'
      const responseObj = { success: true }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.initListener({ vaultId })
      expect(client.rpc.request).toHaveBeenCalledWith(INIT_LISTENER)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ vaultId }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj.success)
    })
  })

  describe('encryptionInit', () => {
    it('should initialize encryption and return success', async () => {
      const responseObj = { success: true }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.encryptionInit()
      expect(client.rpc.request).toHaveBeenCalledWith(ENCRYPTION_INIT)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj.success)
    })
  })

  describe('encryptionGetStatus', () => {
    it('should get encryption status', async () => {
      const statusObj = { status: 'encrypted' }
      const replyData = JSON.stringify(statusObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.encryptionGetStatus()
      expect(client.rpc.request).toHaveBeenCalledWith(ENCRYPTION_GET_STATUS)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(statusObj)
    })
  })

  describe('encryptionGet', () => {
    it('should get encryption data', async () => {
      const key = 'encKey'
      const responseObj = { data: 'encrypted-data' }
      const replyData = JSON.stringify(responseObj)
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.encryptionGet(key)
      expect(client.rpc.request).toHaveBeenCalledWith(ENCRYPTION_GET)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ key }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(responseObj.data)
    })
  })

  describe('encryptionAdd', () => {
    it('should add encryption data', async () => {
      const key = 'encKey'
      const data = { secret: 'value' }
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('added')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.encryptionAdd(key, data)
      expect(client.rpc.request).toHaveBeenCalledWith(ENCRYPTION_ADD)
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ key, data }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('encryptionClose', () => {
    it('should close encryption', async () => {
      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue('closed')
      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      await client.encryptionClose()
      expect(client.rpc.request).toHaveBeenCalledWith(ENCRYPTION_CLOSE)
      expect(mockSend).toHaveBeenCalled()
      expect(mockReply).toHaveBeenCalledWith('utf8')
    })
  })

  describe('Event Emitter for ON_UPDATE', () => {
    it("should emit an 'update' event when an ON_UPDATE command is received", () => {
      const updateHandler = jest.fn()
      client.on('update', updateHandler)
      const callback = client.rpc._callback
      callback({ command: ON_UPDATE })
      expect(updateHandler).toHaveBeenCalled()
    })
  })

  describe('debugMode and _logger', () => {
    it('should initialize with debugMode=false by default', () => {
      const client = new PearpassVaultClient(fakeWorklet, '/path')
      expect(client.debugMode).toBe(false)
    })

    it('should initialize with provided debugMode', () => {
      const client = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: true
      })
      expect(client.debugMode).toBe(true)
    })

    it('should not log to console when debugMode is false', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const client = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: false
      })

      client._logger.log('test message')
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should log to console when debugMode is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const client = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: true
      })

      client._logger.log('test message')
      expect(consoleSpy).toHaveBeenCalledWith('test message')

      consoleSpy.mockRestore()
    })

    it('should always log errors regardless of debugMode', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const client1 = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: false
      })
      client1._logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')

      consoleErrorSpy.mockClear()

      const client2 = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: true
      })
      client2._logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')

      consoleErrorSpy.mockRestore()
    })

    it('should handle LOGGER commands from RPC', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const client = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: true
      })

      const callback = client.rpc._callback
      callback({ command: 'LOGGER_test_message' })

      expect(consoleSpy).toHaveBeenCalledWith('LOGGER:', '_test_message')

      consoleSpy.mockRestore()
    })

    it('should log errors for unknown commands', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const client = new PearpassVaultClient(fakeWorklet, '/path')

      const callback = client.rpc._callback
      callback({ command: 'UNKNOWN_COMMAND' })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unknown command:',
        'UNKNOWN_COMMAND'
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('decryptVaultKey', () => {
    it('should decrypt the vault key with provided parameters', async () => {
      const decryptParams = {
        ciphertext: 'encrypted-content',
        nonce: 'random-nonce',
        salt: 'salt-value',
        password: 'testPassword123'
      }

      const decryptedData = 'decrypted-vault-key'
      const responseObj = { data: decryptedData }
      const replyData = JSON.stringify(responseObj)

      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)

      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.decryptVaultKey(decryptParams)

      expect(client.rpc.request).toHaveBeenCalledWith(
        'ENCRYPTION_DECRYPT_VAULT_KEY'
      )
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify(decryptParams))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(decryptedData)
    })

    it('should handle errors when decrypting vault key', async () => {
      const decryptParams = {
        ciphertext: 'encrypted-content',
        nonce: 'random-nonce',
        salt: 'salt-value',
        password: 'wrongPassword'
      }

      const mockSend = jest
        .fn()
        .mockRejectedValue(new Error('Decryption error'))

      client.rpc.request.mockReturnValueOnce({
        send: mockSend
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await client.decryptVaultKey(decryptParams)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error adding encryption:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should log decrypt vault key operation in debug mode', async () => {
      const debugClient = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: true
      })

      const decryptParams = {
        ciphertext: 'encrypted-content',
        nonce: 'random-nonce',
        salt: 'salt-value',
        password: 'testPassword123'
      }

      const responseObj = { data: 'decrypted-key' }
      const replyData = JSON.stringify(responseObj)

      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)

      debugClient.rpc.request = jest.fn().mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await debugClient.decryptVaultKey(decryptParams)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Decrypting vault key',
        expect.objectContaining(decryptParams)
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Vault key decrypted',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should return undefined when decryption fails', async () => {
      const decryptParams = {
        ciphertext: 'encrypted-content',
        nonce: 'random-nonce',
        salt: 'salt-value',
        password: 'testPassword123'
      }

      const responseObj = { error: 'Invalid password' }
      const replyData = JSON.stringify(responseObj)

      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)

      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.decryptVaultKey(decryptParams)

      expect(result).toBeUndefined()
    })
  })

  describe('encryptVaultKey', () => {
    it('should encrypt the vault key with provided password', async () => {
      const password = 'strongPassword123'
      const encryptedData = {
        ciphertext: 'encrypted-content',
        nonce: 'random-nonce',
        salt: 'salt-value'
      }
      const responseObj = { data: encryptedData }
      const replyData = JSON.stringify(responseObj)

      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)

      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.encryptVaultKey(password)

      expect(client.rpc.request).toHaveBeenCalledWith(
        ENCRYPTION_ENCRYPT_VAULT_KEY
      )
      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ password }))
      expect(mockReply).toHaveBeenCalledWith('utf8')
      expect(result).toEqual(encryptedData)
    })

    it('should handle errors when encrypting vault key', async () => {
      const password = 'strongPassword123'
      const mockSend = jest
        .fn()
        .mockRejectedValue(new Error('Encryption error'))

      client.rpc.request.mockReturnValueOnce({
        send: mockSend
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await client.encryptVaultKey(password)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error adding encryption:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should log encrypt vault key operation in debug mode', async () => {
      const debugClient = new PearpassVaultClient(fakeWorklet, '/path', {
        debugMode: true
      })

      const password = 'strongPassword123'
      const encryptedData = {
        ciphertext: 'encrypted-content',
        nonce: 'random-nonce',
        salt: 'salt-value'
      }
      const responseObj = { data: encryptedData }
      const replyData = JSON.stringify(responseObj)

      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)

      debugClient.rpc.request = jest.fn().mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await debugClient.encryptVaultKey(password)

      expect(consoleSpy).toHaveBeenCalledWith('Encrypting vault key', password)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Vault key encrypted',
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('should return undefined when encryption fails without response data', async () => {
      const password = 'strongPassword123'
      const responseObj = { error: 'Encryption failed' }
      const replyData = JSON.stringify(responseObj)

      const mockSend = jest.fn().mockResolvedValue()
      const mockReply = jest.fn().mockResolvedValue(replyData)

      client.rpc.request.mockReturnValueOnce({
        send: mockSend,
        reply: mockReply
      })

      const result = await client.encryptVaultKey(password)

      expect(result).toBeUndefined()
    })
  })
})
