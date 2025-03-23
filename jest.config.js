export default {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(bare-crypto)/)'],
  setupFiles: ['<rootDir>/jest.setup.js']
}
