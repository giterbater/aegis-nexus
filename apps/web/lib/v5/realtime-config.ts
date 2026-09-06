export type RealtimeTransport = 'sse' | 'websocket'

export interface RealtimeConfig {
  endpoint: string
  transport: RealtimeTransport
  reconnectBaseMs: number
  reconnectMaxMs: number
  heartbeatTimeoutMs: number
}

export function getRealtimeConfig(): RealtimeConfig {
  const endpoint = process.env.NEXT_PUBLIC_AEGIS_STREAM_URL?.trim() || '/api/intel/stream'
  const transport = (process.env.NEXT_PUBLIC_AEGIS_STREAM_TRANSPORT || 'sse') as RealtimeTransport

  return {
    endpoint,
    transport: transport === 'websocket' ? 'websocket' : 'sse',
    reconnectBaseMs: 1000,
    reconnectMaxMs: 30000,
    heartbeatTimeoutMs: 45000,
  }
}
