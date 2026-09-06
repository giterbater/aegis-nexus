# Aegis Nexus V5

V5 is a rebuild of Aegis Nexus around a real event/intelligence contract. V4's command-center visual language and product concepts remain the reference, while simulated defaults, disconnected realtime paths, fake embeddings, and synthetic intelligence values are removed from the core architecture.

## Runtime flow

```text
Sources -> Ingestion -> Normalized Event -> Deduplication
       -> Classification -> Entity/Relationship Extraction
       -> Storage -> Correlation -> Analyst Agents
       -> Intelligence Event -> Realtime Gateway -> UI
```

## Frontend state

The UI must explicitly distinguish `LIVE`, `DEGRADED`, `CONNECTING`, `OFFLINE`, `SIMULATED`, and `ERROR`. Backend failure must never silently masquerade as live intelligence.

## Event contract

```ts
interface IntelligenceEvent {
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
```

## Agent contract

Analyst agents are specialized roles (planner, researcher, verifier, risk analyst, summarizer, timeline analyst). Agents produce evidence-linked analysis; they do not invent telemetry or silently convert missing data into facts.

## V5 principles

- Preserve the Aegis Nexus identity and command-center experience.
- Real data paths are authoritative.
- Simulation is an explicit mode.
- Every intelligence claim has provenance and confidence.
- Realtime transport is a transport layer, not a data generator.
- Provider/model selection is centralized.
- UI components consume normalized state rather than backend-specific payloads.
- Fail visibly and safely instead of hiding infrastructure failures.
