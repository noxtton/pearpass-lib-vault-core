import cenc from 'compact-encoding'

import { WORKLET_LOGGER } from '../api'
import { rpc } from '../app'

export const workletLogger = (...data) => {
  const req = rpc.request(WORKLET_LOGGER)

  req.send(cenc.encode(cenc.json, { data }))
}
