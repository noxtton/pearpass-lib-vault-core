import sodium from 'sodium-native'

/**
 * @param {{
 *   ciphertext: string
 *   nonce: string
 *   decryptionKey: string
 * }} data
 * @returns {string | undefined}
 */
export const decryptVaultKey = (data) => {
  const ciphertext = Buffer.from(data.ciphertext, 'base64')
  const nonce = Buffer.from(data.nonce, 'base64')

  const decryptionKey = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  Buffer.from(data.decryptionKey, 'hex').copy(decryptionKey)

  const plainText = Buffer.alloc(
    ciphertext.length - sodium.crypto_secretbox_MACBYTES
  )

  if (
    !sodium.crypto_secretbox_open_easy(
      plainText,
      ciphertext,
      nonce,
      decryptionKey
    )
  ) {
    return undefined
  }

  return plainText.toString('base64')
}
