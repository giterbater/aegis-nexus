import { describe, expect, it } from 'vitest'
import { normalizeIntelligenceEvent } from './normalize'

describe('V5 realtime contract', () => {
  it('accepts canonical event payloads', () => {
    const event = normalizeIntelligenceEvent({
      id: 'evt-1',
      type: 'ALERT',
      timestamp: '2026-09-06T10:00:00.000Z',
      source: 'test-source',
      title: 'Test event',
      severity: 90,
      confidence: 82,
    })
    expect(event?.id).toBe('evt-1')
    expect(event?.severity).toBe(90)
    expect(event?.confidence).toBe(82)
  })

  it('rejects incomplete events', () => {
    expect(normalizeIntelligenceEvent({ id: 'evt-2', title: 'missing timestamp' })).toBeNull()
  })
})
