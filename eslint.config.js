import { eslintConfig } from 'tether-dev-docs'

export default [
  ...eslintConfig,
  {
    languageOptions: {
      globals: {
        BareKit: 'readonly'
      }
    },
    ignores: ['dist']
  }
]
