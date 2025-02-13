import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { Worklet } from 'react-native-bare-kit'

const RPC = require('bare-rpc')

const worklet = new Worklet()
export let rpcRef = null
export let fileUri = null
export let directoryPath = null
export let rpcReady = false

function noReply() {}

async function ensureDirectoryExist(dirPath) {
  const dirInfo = await FileSystem.getInfoAsync(dirPath)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true })
  }
}

async function loadFileSystem() {
  const coreStorePath = `${FileSystem.documentDirectory}weights/`
  await ensureDirectoryExist(coreStorePath)
  directoryPath = coreStorePath
}

async function loadAssetByPlatform() {
  const assetByPlatform = Platform.select({
    ios: require('./vault-ios.bundle'),
    android: require('./vault-android.bundle')
  })

  const assets = await Asset.loadAsync([assetByPlatform])
  fileUri = assets[0].localUri
}

async function initWorklet(callback = noReply) {
  try {
    await loadFileSystem()
    await loadAssetByPlatform()

    if (!fileUri) {
      throw new Error('File URI is not available.')
    }

    console.log('worklet.start', worklet.start)

    await worklet.start(
      fileUri,
      Platform.select({
        ios: require('./vault-ios.bundle'),
        android: require('./vault-android.bundle')
      })
    )

    if (!rpcRef) {
      rpcRef = new RPC(worklet.IPC, callback)
      rpcReady = true
    }

    console.log('Worklet initialized. RPC ready:', rpcReady)
  } catch (error) {
    console.error('Error initializing worklet:', error)
  }
}

initWorklet()

function getWorkletData() {
  return {
    rpc: rpcRef,
    rpcReady: rpcReady,
    directoryPath: directoryPath
  }
}

console.log('Current worklet data:', getWorkletData())
