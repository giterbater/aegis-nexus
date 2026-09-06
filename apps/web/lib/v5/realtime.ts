'use client'

import { useEffect } from 'react'
import { useAegisV5Store } from './store'
import { normalizeIntelligenceEvents } from './normalize'

export function useAegisV5Realtime(enabled = true) {
  const setMode = useAegisV5Store((state) => state.setMode)
  const ingestEvents = useAegisV5Store((state) => state.ingestEvents)

  useEffect(() => {
    if (!enabled) return
    const endpoint = process.env.NEXT_PUBLIC_AEGIS_STREAM_URL ?? '/api/intel/stream'
    let source: EventSource | null = null
    let stopped = false

    const connect = () => {
      if (stopped) return
      setMode('CONNECTING')
      source = new EventSource(endpoint)
      source.onopen = () => setMode('LIVE')
      source.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data)
          const events = normalizeIntelligenceEvents(parsed.events ?? parsed)
          if (events.length) ingestEvents(events)
        } catch {
          setMode('ERROR')
        }
      }
      source.onerror = () => {
        setMode('DEGRADED')
        source?.close()
        if (!stopped) window.setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      stopped = true
      source?.close()
    }
  }, [enabled, ingestEvents, setMode])
}
