import sodium from 'sodium-native'

/**
 * @param {{
 *   ciphertext: string
 *   nonce: string
 *   salt: string
 *   password: string
 * }} params
 * @returns {string | undefined}
 */
export const decryptVaultKey = (data) => {
  const ciphertext = Buffer.from(data.ciphertext, 'base64')
  const nonce = Buffer.from(data.nonce, 'base64')
  const salt = Buffer.from(data.salt, 'base64')
  const password = Buffer.from(data.password)

  const descryptionKey = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  const opslimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
  const memlimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
  const algo = sodium.crypto_pwhash_ALG_DEFAULT

  sodium.crypto_pwhash(
    descryptionKey,
    Buffer.from(password),
    salt,
    opslimit,
    memlimit,
    algo
  )

  const plainText = Buffer.alloc(
    ciphertext.length - sodium.crypto_secretbox_MACBYTES
  )

  if (
    !sodium.crypto_secretbox_open_easy(
      plainText,
      ciphertext,
      nonce,
      descryptionKey
    )
  ) {
    return undefined
  }

  return plainText.toString('base64')
}
