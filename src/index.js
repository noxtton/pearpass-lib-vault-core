import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { Worklet } from 'react-native-bare-kit'

const RPC = require('bare-rpc')

const noReply = () => {
  // No reply
}

export let rpc = null
export let fileUri = null
export let directoryPath = null
export let rpcReady = false

async function initWorklet(callback = noReply) {
  try {
    // Create a new worklet instance
    const worklet = new Worklet()

    if (!worklet) {
      throw new Error(
        'Failed to initialize Worklet - constructor returned null'
      )
    }

    console.log('Initializing worklet', worklet)

    // Helper function to ensure a directory exists
    async function ensureDirectoryExist(dirPath) {
      const dirInfo = await FileSystem.getInfoAsync(dirPath)
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true })
      }
    }

    // Set up the file system directory
    async function loadFileSystem() {
      const coreStorePath = FileSystem.documentDirectory
      if (!coreStorePath) {
        throw new Error('documentDirectory is null')
      }
      await ensureDirectoryExist(coreStorePath)
      directoryPath = coreStorePath
    }

    // Load the appropriate asset based on the platform
    async function loadAssetByPlatform() {
      const assetByPlatform = Platform.select({
        ios: require('./vault-ios.bundle'),
        android: require('./vault-android.bundle')
      })

      if (!assetByPlatform) {
        throw new Error('Bundle asset not found for platform')
      }

      const [asset] = await Asset.loadAsync([assetByPlatform])
      if (!asset?.localUri) {
        throw new Error('Failed to load asset bundle')
      }
      fileUri = asset.localUri
    }

    // Run the initialization steps sequentially
    await loadFileSystem()
    await loadAssetByPlatform()

    // Start the worklet with the obtained file URI
    if (!fileUri) {
      throw new Error('fileUri is null')
    }

    await worklet.start(fileUri)

    // Initialize the RPC instance
    if (!worklet.IPC) {
      throw new Error('Worklet IPC is null')
    }

    if (!rpc) {
      rpc = new RPC(worklet.IPC, callback)
      rpcReady = true
    }

    console.log('Worklet initialized successfully')
  } catch (error) {
    console.error('Failed to initialize worklet:', error)
    throw error
  }
}

// Add error handling to the initial call
initWorklet().catch((error) => {
  console.error('Initial worklet initialization failed:', error)
})
