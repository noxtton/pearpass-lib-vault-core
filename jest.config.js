export default {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(bare-crypto|expo-asset)/)'],
  setupFiles: ['<rootDir>/jest.setup.js']
}
