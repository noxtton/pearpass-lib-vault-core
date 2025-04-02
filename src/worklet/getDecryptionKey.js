import sodium from 'sodium-native'

/**
 * @param {{
 *   salt: string
 *   password: string
 * }} data
 * @returns {string | undefined}
 */
export const getDecryptionKey = (data) => {
  const salt = Buffer.from(data.salt, 'base64')
  const password = Buffer.from(data.password)

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

  const decryptionKeyHex = Buffer.from(decryptionKey).toString('hex')

  return decryptionKeyHex
}
