'use client'

import { useAegisV5Store } from '../../lib/v5/store'

export function V5EventFeed() {
  const events = useAegisV5Store((state) => state.events)
  const selectEvent = useAegisV5Store((state) => state.selectEvent)
  const selected = useAegisV5Store((state) => state.selectedEventId)

  return (
    <section className="flex min-h-0 flex-1 flex-col border border-white/10 bg-black/40">
      <div className="border-b border-white/10 px-4 py-3 text-xs font-mono tracking-widest text-white/60">INTELLIGENCE STREAM</div>
      <div className="min-h-0 flex-1 overflow-auto">
        {events.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-white/35">WAITING FOR VERIFIED INTELLIGENCE EVENTS</div>
        ) : events.map((event) => (
          <button
            key={event.id}
            onClick={() => selectEvent(event.id)}
            className={`block w-full border-b border-white/5 px-4 py-3 text-left hover:bg-white/5 ${selected === event.id ? 'bg-white/10' : ''}`}
          >
            <div className="flex justify-between gap-3 text-[10px] font-mono text-white/40">
              <span>{event.source.toUpperCase()}</span>
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="mt-1 text-sm font-medium text-white">{event.title}</div>
            {event.summary && <div className="mt-1 line-clamp-2 text-xs text-white/55">{event.summary}</div>}
            <div className="mt-2 flex gap-3 text-[10px] font-mono text-white/35">
              <span>SEV {Math.round(event.severity)}</span>
              <span>CONF {Math.round(event.confidence)}%</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
