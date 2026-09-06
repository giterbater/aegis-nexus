export type RuntimeSource = 'BACKEND' | 'SIMULATOR' | 'NONE'

export interface RuntimeSnapshot {
  status: 'LIVE' | 'DEGRADED' | 'CONNECTING' | 'OFFLINE' | 'ERROR'
  source: RuntimeSource
  checkedAt: string
  endpoint: string
}

export function runtimeSnapshot(source: RuntimeSource, endpoint: string, status: RuntimeSnapshot['status']): RuntimeSnapshot {
  return { status, source, checkedAt: new Date().toISOString(), endpoint }
}

export function backendConfigured() {
  return Boolean(process.env.AEGIS_API_URL)
}
