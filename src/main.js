import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { Worklet } from 'react-native-bare-kit'

import { PearpassVaultClient } from './pearpassVaultClient'

const worklet = new Worklet()

export let fileUri = null

const ensureDirectoryExist = async (dirPath) => {
  const dirInfo = await FileSystem.getInfoAsync(dirPath)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true })
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

/**
 * @param {{
 *   debugMode?: boolean
 * }} options
 * @returns {Promise<PearpassVaultClient>}
 */
export const createPearpassVaultClient = async ({ debugMode } = {}) => {
  await loadAssetByPlatform()

  if (!fileUri) {
    throw new Error('File URI is not available.')
  }

  await worklet.start(fileUri)

  const path = `${FileSystem.documentDirectory}pearpass`

  await ensureDirectoryExist(path)

  return new PearpassVaultClient(worklet, path, {
    debugMode: debugMode
  })
}
