import { handleRpcCommand } from './app'
import { isPearWorker } from './utils/isPearWorker'
import { workletLogger } from './utils/workletLogger'

const ipc = isPearWorker() ? Pear.worker.pipe() : BareKit.IPC

ipc.on('data', async (buffer) => {
  const rawData = buffer.toString('utf8')

  try {
    const { command, data } = JSON.parse(rawData)
    workletLogger.log('Received message:', { command, data })

    const req = {
      command: command,
      data: JSON.stringify(data),
      reply: (data) => {
        BareKit.IPC.write(data)
      },
      createRequestStream: () => {},
      createResponseStream: () => {},
      send: () => {}
    }

    await handleRpcCommand(req)
  } catch (error) {
    workletLogger.error('Error receiving message:', error)
  }
})

// eslint-disable-next-line no-undef
ipc.on('close', () => Bare.exit(0))

// eslint-disable-next-line no-undef
ipc.on('end', () => Bare.exit(0))
