export type SystemMode = 'LIVE' | 'DEGRADED' | 'CONNECTING' | 'OFFLINE' | 'SIMULATED' | 'ERROR'

export interface IntelligenceEvent {
  id: string
  type: string
  timestamp: string
  source: string
  title: string
  summary?: string
  severity: number
  confidence: number
  location?: { lat: number; lng: number; label?: string }
  entities?: string[]
  tags?: string[]
  evidence?: string[]
}

export interface IntelligenceAgent {
  id: string
  name: string
  role: string
  status: 'ONLINE' | 'BUSY' | 'IDLE' | 'OFFLINE' | 'ERROR'
  confidence: number
  currentTask?: string
  lastActive: string
}

export interface ThreatZone {
  id: string
  name: string
  lat: number
  lng: number
  severity: number
  category: string
}
