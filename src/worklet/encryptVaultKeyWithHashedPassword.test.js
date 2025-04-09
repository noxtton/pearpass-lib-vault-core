import sodium from 'sodium-native'

import { encryptVaultKeyWithHashedPassword } from './encryptVaultKeyWithHashedPassword'

const validHashedPassword = 'a'.repeat(64)

describe('encryptVaultKeyWithHashedPassword', () => {
  test('should return an object with ciphertext and nonce properties', () => {
    const result = encryptVaultKeyWithHashedPassword(validHashedPassword)
    expect(result).toHaveProperty('ciphertext')
    expect(result).toHaveProperty('nonce')
    expect(typeof result.ciphertext).toBe('string')
    expect(typeof result.nonce).toBe('string')
  })

  test('ciphertext and nonce should be valid base64 strings with correct lengths', () => {
    const result = encryptVaultKeyWithHashedPassword(validHashedPassword)

    const ciphertextBuffer = Buffer.from(result.ciphertext, 'base64')
    const nonceBuffer = Buffer.from(result.nonce, 'base64')

    expect(ciphertextBuffer.length).toBe(32 + sodium.crypto_secretbox_MACBYTES)

    expect(nonceBuffer.length).toBe(sodium.crypto_secretbox_NONCEBYTES)
  })

  test('should generate different ciphertext and nonce on subsequent calls', () => {
    const result1 = encryptVaultKeyWithHashedPassword(validHashedPassword)
    const result2 = encryptVaultKeyWithHashedPassword(validHashedPassword)
    expect(result1.ciphertext).not.toBe(result2.ciphertext)
    expect(result1.nonce).not.toBe(result2.nonce)
  })

  test('should throw an error for an invalid hex string', () => {
    expect(() => encryptVaultKeyWithHashedPassword('invalidhex')).toThrow()
  })

  test('should throw an error for an empty string', () => {
    expect(() => encryptVaultKeyWithHashedPassword('')).toThrow()
  })
})
