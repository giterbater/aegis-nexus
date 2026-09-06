'use client'

import { useEffect, useRef } from 'react'
import { useAegisV5Store } from './store'
import { normalizeIntelligenceEvents } from './normalize'
import { getRealtimeConfig } from './realtime-config'

export function useAegisV5Realtime(enabled = true) {
  const setMode = useAegisV5Store((state) => state.setMode)
  const ingestEvents = useAegisV5Store((state) => state.ingestEvents)
  const timer = useRef<number | null>(null)
  const stopped = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const config = getRealtimeConfig()
    stopped.current = false
    let source: EventSource | null = null
    let attempt = 0
    let heartbeatTimer: number | null = null

    const clearTimers = () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      if (heartbeatTimer !== null) window.clearTimeout(heartbeatTimer)
      timer.current = null
      heartbeatTimer = null
    }

    const scheduleReconnect = () => {
      if (stopped.current || timer.current !== null) return
      const delay = Math.min(config.reconnectBaseMs * 2 ** attempt, config.reconnectMaxMs)
      attempt += 1
      timer.current = window.setTimeout(() => {
        timer.current = null
        connect()
      }, delay)
    }

    const armHeartbeat = () => {
      if (heartbeatTimer !== null) window.clearTimeout(heartbeatTimer)
      heartbeatTimer = window.setTimeout(() => {
        setMode('DEGRADED')
        source?.close()
        scheduleReconnect()
      }, config.heartbeatTimeoutMs)
    }

    const connect = () => {
      if (stopped.current) return
      setMode('CONNECTING')
      source?.close()
      source = new EventSource(config.endpoint)
      source.onopen = () => {
        attempt = 0
        setMode('LIVE')
        armHeartbeat()
      }
      source.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data) as Record<string, unknown>
          if (parsed.type === 'heartbeat' || parsed.type === 'connected') {
            armHeartbeat()
            return
          }
          const events = normalizeIntelligenceEvents(parsed.data ?? parsed.events ?? parsed)
          if (events.length) ingestEvents(events)
          armHeartbeat()
        } catch {
          setMode('ERROR')
        }
      }
      source.onerror = () => {
        setMode('DEGRADED')
        source?.close()
        scheduleReconnect()
      }
    }

    connect()
    return () => {
      stopped.current = true
      source?.close()
      clearTimers()
    }
  }, [enabled, ingestEvents, setMode])
}
