'use client'

import { useAegisV5Store } from '../../lib/v5/store'

export function V5StatusBar() {
  const mode = useAegisV5Store((state) => state.mode)
  const events = useAegisV5Store((state) => state.events.length)
  const agents = useAegisV5Store((state) => state.agents.length)

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-2 text-[11px] font-mono tracking-wider text-white/70">
      <div className="flex items-center gap-4">
        <span className="font-bold text-white">AEGIS NEXUS // V5</span>
        <span className="text-white/40">INTELLIGENCE COMMAND</span>
      </div>
      <div className="flex items-center gap-4">
        <span>EVENTS {events}</span>
        <span>AGENTS {agents}</span>
        <span className="text-white">● {mode}</span>
      </div>
    </header>
  )
}
