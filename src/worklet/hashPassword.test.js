import sodium from 'sodium-native'

import { hashPassword } from './hashPassword'

const validPassword = 'mySuperSecretPassword'

describe('hashPassword', () => {
  test('should return an object with hashedPassword and salt properties', () => {
    const result = hashPassword(validPassword)
    expect(result).toHaveProperty('hashedPassword')
    expect(result).toHaveProperty('salt')
    expect(typeof result.hashedPassword).toBe('string')
    expect(typeof result.salt).toBe('string')
  })

  test('hashedPassword should be valid hex and have the expected length', () => {
    const result = hashPassword(validPassword)

    const hashBuffer = Buffer.from(result.hashedPassword, 'hex')

    expect(hashBuffer.length).toBe(sodium.crypto_secretbox_KEYBYTES)

    expect(result.hashedPassword.length).toBe(
      sodium.crypto_secretbox_KEYBYTES * 2
    )
  })

  test('salt should be valid base64 and decode to the expected length', () => {
    const result = hashPassword(validPassword)

    const saltBuffer = Buffer.from(result.salt, 'base64')

    expect(saltBuffer.length).toBe(sodium.crypto_pwhash_SALTBYTES)
  })

  test('different invocations produce different salts and hashes even with the same password', () => {
    const result1 = hashPassword(validPassword)
    const result2 = hashPassword(validPassword)

    expect(result1.salt).not.toBe(result2.salt)
    expect(result1.hashedPassword).not.toBe(result2.hashedPassword)
  })

  test('should work correctly with an empty password', () => {
    const result = hashPassword('')

    const hashBuffer = Buffer.from(result.hashedPassword, 'hex')
    expect(hashBuffer.length).toBe(sodium.crypto_secretbox_KEYBYTES)
    const saltBuffer = Buffer.from(result.salt, 'base64')
    expect(saltBuffer.length).toBe(sodium.crypto_pwhash_SALTBYTES)
  })
})
