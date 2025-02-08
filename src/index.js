import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { Worklet } from 'react-native-bare-kit'

const RPC = require('bare-rpc')

const noReply = () => {
  // No reply
}

// Create a new worklet instance
const worklet = new Worklet()

// Local variables instead of React state
export let rpc = null
export let fileUri = null
export let directoryPath = null
export let rpcReady = false

async function initWorklet(callback = noReply) {
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
    await ensureDirectoryExist(coreStorePath)
    directoryPath = coreStorePath
  }

  // Load the appropriate asset based on the platform
  async function loadAssetByPlatform() {
    const assetByPlatform =
      Platform.OS === 'ios'
        ? require('./vault-ios.bundle')
        : require('./vault-android.bundle')

    const [asset] = await Asset.loadAsync([assetByPlatform])
    fileUri = asset.localUri
  }

  // Run the initialization steps sequentially
  await loadFileSystem()
  await loadAssetByPlatform()

  // Start the worklet with the obtained file URI
  await worklet.start(fileUri)

  // Initialize the RPC instance
  if (!rpc) {
    rpc = new RPC(worklet.IPC, callback)
    rpcReady = true
  }

  console.log('Worklet initialized', rpc)
}

initWorklet()
