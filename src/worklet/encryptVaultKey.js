import sodium from 'sodium-native'

/**
 *
 * @param {string} password
 * @returns {{
 *   ciphertext: string
 *   nonce: string
 *   salt: string
 * }}
 */
export const encryptVaultKey = (password) => {
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  const key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  const salt = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES)
  const encryptionKey = Buffer.alloc(32)

  const ciphertext = Buffer.alloc(
    encryptionKey.length + sodium.crypto_secretbox_MACBYTES
  )

  sodium.randombytes_buf(salt)
  sodium.randombytes_buf(encryptionKey)
  sodium.randombytes_buf(nonce)

  const opslimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
  const memlimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
  const algo = sodium.crypto_pwhash_ALG_DEFAULT

  sodium.crypto_pwhash(
    key,
    Buffer.from(password),
    salt,
    opslimit,
    memlimit,
    algo
  )

  sodium.crypto_secretbox_easy(ciphertext, encryptionKey, nonce, key)

  return {
    ciphertext: ciphertext.toString('base64'),
    nonce: nonce.toString('base64'),
    salt: salt.toString('base64')
  }
}
