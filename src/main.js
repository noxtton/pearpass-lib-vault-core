import RPC from 'bare-rpc'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { setStoragePath, setVaultManager } from 'pearpass-lib-vault'
import { Platform } from 'react-native'
import { Worklet } from 'react-native-bare-kit'

import { VaultManager } from './vaultManager'

const worklet = new Worklet()

export let fileUri = null

const ensureDirectoryExist = async (dirPath) => {
  const dirInfo = await FileSystem.getInfoAsync(dirPath)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true })
  }
}

const clearDocumentDirectory = async () => {
  try {
    const files = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory
    )

    await Promise.all(
      files.map((file) =>
        FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`, {
          idempotent: true,
          recursive: true
        })
      )
    )
    console.log('Document directory cleared!')
  } catch (error) {
    console.error('Error clearing document directory:', error)
  }
}

const checkExistingFiles = async () => {
  try {
    const files = await FileSystem.readDirectoryAsync(
      `${FileSystem.documentDirectory}pearpass`
    )

    const vaultFiles = await FileSystem.readDirectoryAsync(
      `${FileSystem.documentDirectory}pearpass/vault`
    )

    console.log('All files: ', files)

    console.log('Existing vaults:', vaultFiles)
  } catch (error) {
    console.error('Error checking file exists:', error)
  }
}

const loadAssetByPlatform = async () => {
  const assetByPlatform = Platform.select({
    ios: require('../bundles/autopass-ios.bundle'),
    android: require('../bundles/autopass-android.bundle')
  })

  const assets = await Asset.loadAsync([assetByPlatform])
  fileUri = assets[0].localUri
}

const initWorklet = async () => {
  try {
    await loadAssetByPlatform()

    if (!fileUri) {
      throw new Error('File URI is not available.')
    }

    await worklet.start(fileUri)

    return new RPC(worklet.IPC, () => {})
  } catch (error) {
    console.error('Error initializing worklet:', error)
  }
}

export const initPearpass = async () => {
  const rpc = await initWorklet()

  setVaultManager(new VaultManager(rpc))

  const path = `${FileSystem.documentDirectory}pearpass`

  await ensureDirectoryExist(path)

  await setStoragePath(path)
}
