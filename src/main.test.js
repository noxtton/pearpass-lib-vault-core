jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn()
  }
}))

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://document/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn()
}))

jest.mock('react-native', () => ({
  Platform: {
    select: jest.fn()
  }
}))

jest.mock('../bundles/autopass-ios.bundle', () => ({}), { virtual: true })
jest.mock('../bundles/autopass-android.bundle', () => ({}), { virtual: true })

jest.mock('react-native-bare-kit', () => {
  const startMock = jest.fn().mockResolvedValue()
  const Worklet = jest.fn().mockImplementation(function () {
    this.start = startMock
    return this
  })
  Worklet.startMock = startMock
  return { Worklet }
})

jest.mock('./pearpassVaultClient', () => ({
  PearpassVaultClient: jest.fn()
}))

import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'
import { Worklet } from 'react-native-bare-kit'

import {
  clearDocumentDirectory,
  createPearpassVaultClient,
  fileUri
} from './main'
import { PearpassVaultClient } from './pearpassVaultClient'

describe('clearDocumentDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should clear all files in the document directory', async () => {
    const files = ['file1.txt', 'file2.txt']
    FileSystem.readDirectoryAsync.mockResolvedValue(files)
    FileSystem.deleteAsync.mockResolvedValue()

    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => {})

    await clearDocumentDirectory()

    expect(FileSystem.readDirectoryAsync).toHaveBeenCalledWith(
      FileSystem.documentDirectory
    )
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(files.length)
    files.forEach((file) => {
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${FileSystem.documentDirectory}${file}`,
        { idempotent: true, recursive: true }
      )
    })
    expect(consoleLogSpy).toHaveBeenCalledWith('Document directory cleared!')
    consoleLogSpy.mockRestore()
  })

  it('should handle errors when clearing the document directory', async () => {
    const error = new Error('Test error')
    FileSystem.readDirectoryAsync.mockRejectedValue(error)
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    await clearDocumentDirectory()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error clearing document directory:',
      error
    )
    consoleErrorSpy.mockRestore()
  })
})

describe('createPearpassVaultClient', () => {
  let workletInstance
  beforeEach(() => {
    jest.clearAllMocks()

    Platform.select.mockReturnValue({ dummy: 'asset' })

    Asset.loadAsync.mockResolvedValue([{ localUri: 'file://dummy.bundle' }])

    FileSystem.getInfoAsync.mockResolvedValue({ exists: true })

    FileSystem.makeDirectoryAsync.mockResolvedValue()

    new Worklet()
    workletInstance = Worklet.mock.instances[0]
  })

  it('should create a PearpassVaultClient when fileUri is available', async () => {
    const client = await createPearpassVaultClient({ debugMode: true })

    expect(fileUri).toEqual('file://dummy.bundle')

    expect(Worklet.startMock).toHaveBeenCalledWith('file://dummy.bundle')

    const expectedDir = `${FileSystem.documentDirectory}pearpass`
    expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(expectedDir)

    expect(PearpassVaultClient).toHaveBeenCalledWith(
      workletInstance,
      expectedDir,
      { debugMode: true }
    )
    expect(client).toBeDefined()
  })

  it('should throw an error when fileUri is not available', async () => {
    Asset.loadAsync.mockResolvedValue([{}])

    await expect(createPearpassVaultClient()).rejects.toThrow(
      'File URI is not available.'
    )
  })
})
