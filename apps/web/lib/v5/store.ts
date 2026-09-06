'use client'

import { create } from 'zustand'
import type { IntelligenceAgent, IntelligenceEvent, SystemMode, ThreatZone } from './types'

interface AegisV5State {
  mode: SystemMode
  events: IntelligenceEvent[]
  agents: IntelligenceAgent[]
  threatZones: ThreatZone[]
  selectedEventId: string | null
  selectedAgentId: string | null
  setMode: (mode: SystemMode) => void
  ingestEvents: (events: IntelligenceEvent[]) => void
  upsertAgent: (agent: IntelligenceAgent) => void
  setThreatZones: (zones: ThreatZone[]) => void
  selectEvent: (id: string | null) => void
  selectAgent: (id: string | null) => void
  reset: () => void
}

const initial = {
  mode: 'CONNECTING' as SystemMode,
  events: [] as IntelligenceEvent[],
  agents: [] as IntelligenceAgent[],
  threatZones: [] as ThreatZone[],
  selectedEventId: null,
  selectedAgentId: null,
}

export const useAegisV5Store = create<AegisV5State>((set) => ({
  ...initial,
  setMode: (mode) => set({ mode }),
  ingestEvents: (events) => set((state) => {
    const merged = new Map(state.events.map((event) => [event.id, event]))
    for (const event of events) merged.set(event.id, event)
    return { events: [...merged.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 1000) }
  }),
  upsertAgent: (agent) => set((state) => ({ agents: [...state.agents.filter((item) => item.id !== agent.id), agent] })),
  setThreatZones: (threatZones) => set({ threatZones }),
  selectEvent: (selectedEventId) => set({ selectedEventId }),
  selectAgent: (selectedAgentId) => set({ selectedAgentId }),
  reset: () => set(initial),
}))
