# pearpass-lib-vault-bare

A bare wrapper for Autopass and Corestore

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Dependencies](#dependencies)
- [Related Projects](#related-projects)

## Features
- Secure password storage
- Encryption/decryption capabilities
- Lightweight implementation

## Installation
```bash
npm install pearpass-lib-vault-bare
```

## Usage Examples
```javascript
    import { setPearpassVaultClient } from 'pearpass-lib-vault'
    import { createPearpassVaultClient } from 'pearpass-lib-vault-bare'

    const vaultClient = await createPearpassVaultClient()

    setPearpassVaultClient(vaultClient)
```

## Related Projects
- [pearpass-lib-ui-react-components](https://github.com/noxtton/pearpass-lib-ui-react-components) - A library of React UI components for PearPass
- [pearpass-lib-vault](https://github.com/noxtton/pearpass-lib-vault) - A library for managing password vaults
- [pearpass-lib-vault-desktop](https://github.com/noxtton/pearpass-lib-vault-desktop) - A library for managing password vaults for Pearpass desktop app
