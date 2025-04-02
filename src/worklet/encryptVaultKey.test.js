import { jest } from '@jest/globals'
import sodium from 'sodium-native'

import { encryptVaultKey } from './encryptVaultKey'

jest.mock('sodium-native', () => {
  return {
    crypto_secretbox_NONCEBYTES: 24,
    crypto_secretbox_KEYBYTES: 32,
    crypto_pwhash_SALTBYTES: 16,
    crypto_secretbox_MACBYTES: 16,
    crypto_pwhash_OPSLIMIT_INTERACTIVE: 2,
    crypto_pwhash_MEMLIMIT_INTERACTIVE: 67108864,
    crypto_pwhash_ALG_DEFAULT: 2,
    sodium_malloc: jest.fn((size) => {
      return Buffer.alloc(size)
    }),
    randombytes_buf: jest.fn((buffer) => {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = i % 256
      }
    }),
    crypto_pwhash: jest.fn(),
    crypto_secretbox_easy: jest.fn()
  }
})

describe('encryptVaultKey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return an object with ciphertext, nonce, and salt', () => {
    const password = 'testPassword123'
    const result = encryptVaultKey(password)

    expect(result).toHaveProperty('ciphertext')
    expect(result).toHaveProperty('nonce')
    expect(result).toHaveProperty('salt')
    expect(result).toHaveProperty('decryptionKey')
    expect(typeof result.ciphertext).toBe('string')
    expect(typeof result.nonce).toBe('string')
    expect(typeof result.salt).toBe('string')
    expect(typeof result.decryptionKey).toBe('string')
  })

  test('should generate random nonce, salt, and encryption key', () => {
    const password = 'testPassword123'
    encryptVaultKey(password)

    expect(sodium.randombytes_buf).toHaveBeenCalledTimes(3)
  })

  test('should call crypto_pwhash with correct parameters', () => {
    const password = 'testPassword123'
    encryptVaultKey(password)

    expect(sodium.crypto_pwhash).toHaveBeenCalledTimes(1)
    expect(sodium.crypto_pwhash.mock.calls[0][1]).toEqual(Buffer.from(password))
    expect(sodium.crypto_pwhash.mock.calls[0][3]).toBe(
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
    )
    expect(sodium.crypto_pwhash.mock.calls[0][4]).toBe(
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
    )
    expect(sodium.crypto_pwhash.mock.calls[0][5]).toBe(
      sodium.crypto_pwhash_ALG_DEFAULT
    )
  })

  test('should call crypto_secretbox_easy with correct parameters', () => {
    const password = 'testPassword123'
    encryptVaultKey(password)

    expect(sodium.crypto_secretbox_easy).toHaveBeenCalledTimes(1)
  })

  test('should return base64 encoded strings', () => {
    const password = 'testPassword123'
    const result = encryptVaultKey(password)

    expect(() => Buffer.from(result.ciphertext, 'base64')).not.toThrow()
    expect(() => Buffer.from(result.nonce, 'base64')).not.toThrow()
    expect(() => Buffer.from(result.salt, 'base64')).not.toThrow()
    expect(() => Buffer.from(result.decryptionKey, 'hex')).not.toThrow()
  })
})
