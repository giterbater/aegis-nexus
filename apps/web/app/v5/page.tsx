'use client'

import { useAegisV5Realtime } from '../../lib/v5/realtime'
import { V5StatusBar } from '../../components/v5/V5StatusBar'
import { V5EventFeed } from '../../components/v5/V5EventFeed'

export default function V5Page() {
  useAegisV5Realtime()
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <V5StatusBar />
      <div className="grid min-h-[calc(100vh-37px)] grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="relative min-h-[520px] overflow-hidden border border-white/10 bg-[#080a0d]">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative flex h-full min-h-[520px] items-center justify-center p-8 text-center">
            <div>
              <div className="font-mono text-[10px] tracking-[.35em] text-white/30">GLOBAL INTELLIGENCE SURFACE</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">AEGIS NEXUS V5</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/45">Live visualization is driven by the canonical intelligence event stream. No event data is fabricated when the backend is unavailable.</p>
            </div>
          </div>
        </section>
        <V5EventFeed />
      </div>
    </main>
  )
}
