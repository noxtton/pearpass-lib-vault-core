import sodium from 'sodium-native'

/**
 *
 * @param {string} password
 * @returns {{
 *   ciphertext: string
 *   nonce: string
 *   salt: string
 *   decryptionKey: string
 * }}
 */
export const encryptVaultKey = (password) => {
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  const salt = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES)
  const key = Buffer.alloc(32)

  const ciphertext = Buffer.alloc(key.length + sodium.crypto_secretbox_MACBYTES)

  sodium.randombytes_buf(salt)
  sodium.randombytes_buf(key)
  sodium.randombytes_buf(nonce)

  const decryptionKey = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)

  const opslimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
  const memlimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
  const algo = sodium.crypto_pwhash_ALG_DEFAULT

  sodium.crypto_pwhash(
    decryptionKey,
    Buffer.from(password),
    salt,
    opslimit,
    memlimit,
    algo
  )

  sodium.crypto_secretbox_easy(ciphertext, key, nonce, decryptionKey)

  return {
    ciphertext: ciphertext.toString('base64'),
    nonce: nonce.toString('base64'),
    salt: salt.toString('base64'),
    decryptionKey: Buffer.from(decryptionKey).toString('hex')
  }
}
