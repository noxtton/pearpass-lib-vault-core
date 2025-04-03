import sodium from 'sodium-native'

/**
 *
 * @param {string} hashedPassword
 * @returns {{
 *   ciphertext: string
 *   nonce: string
 * }}
 */
export const encryptVaultKeyWithHashedPassword = (hashedPassword) => {
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  const key = Buffer.alloc(32)

  const ciphertext = Buffer.alloc(key.length + sodium.crypto_secretbox_MACBYTES)

  sodium.randombytes_buf(key)
  sodium.randombytes_buf(nonce)

  sodium.crypto_secretbox_easy(
    ciphertext,
    key,
    nonce,
    Buffer.from(hashedPassword, 'hex')
  )

  return {
    ciphertext: ciphertext.toString('base64'),
    nonce: nonce.toString('base64')
  }
}
