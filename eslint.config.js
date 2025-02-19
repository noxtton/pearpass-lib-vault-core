import sharedConfig from 'pearpass-eslint-config'

export default [
  ...sharedConfig,
  {
    languageOptions: {
      globals: {
        BareKit: 'readonly'
      }
    },
    ignores: ['dist']
  }
]
