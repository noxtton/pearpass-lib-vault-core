import { jest } from '@jest/globals'
import cenc from 'compact-encoding'

import { workletLogger } from './workletLogger'
import { WORKLET_LOGGER } from '../api'
import { rpc } from '../app'

jest.mock('../app', () => ({
  rpc: {
    request: jest.fn()
  }
}))

jest.mock('compact-encoding', () => ({
  encode: jest.fn(),
  json: {}
}))

describe('workletLogger', () => {
  let mockSend

  beforeEach(() => {
    jest.clearAllMocks()

    mockSend = jest.fn()
    rpc.request.mockReturnValue({ send: mockSend })
  })

  it('should call rpc.request with WORKLET_LOGGER', () => {
    workletLogger('test message')
    expect(rpc.request).toHaveBeenCalledWith(WORKLET_LOGGER)
  })

  it('should encode the data using compact-encoding', () => {
    workletLogger('test message')
    expect(cenc.encode).toHaveBeenCalledWith(cenc.json, {
      data: ['test message']
    })
  })

  it('should send the encoded data', () => {
    const mockEncodedData = 'encoded-data'
    cenc.encode.mockReturnValue(mockEncodedData)

    workletLogger('test message')

    expect(mockSend).toHaveBeenCalledWith(mockEncodedData)
  })

  it('should handle multiple arguments', () => {
    workletLogger('message1', 'message2', { key: 'value' })

    expect(cenc.encode).toHaveBeenCalledWith(cenc.json, {
      data: ['message1', 'message2', { key: 'value' }]
    })
  })
})
