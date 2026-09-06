import type { IntelligenceEvent } from './types'

const clamp = (value: unknown, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.min(100, number))
}

export function normalizeIntelligenceEvent(input: unknown): IntelligenceEvent | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const id = String(value.id ?? '').trim()
  const title = String(value.title ?? value.name ?? '').trim()
  const timestamp = String(value.timestamp ?? value.created_at ?? '').trim()
  if (!id || !title || !timestamp) return null

  const location = value.location && typeof value.location === 'object'
    ? value.location as Record<string, unknown>
    : undefined
  const lat = Number(location?.lat)
  const lng = Number(location?.lng)

  return {
    id,
    type: String(value.type ?? 'EVENT'),
    timestamp,
    source: String(value.source ?? 'unknown'),
    title,
    summary: value.summary ? String(value.summary) : undefined,
    severity: clamp(value.severity),
    confidence: clamp(value.confidence),
    location: Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng, label: location?.label ? String(location.label) : undefined }
      : undefined,
    entities: Array.isArray(value.entities) ? value.entities.map(String) : undefined,
    tags: Array.isArray(value.tags) ? value.tags.map(String) : undefined,
    evidence: Array.isArray(value.evidence) ? value.evidence.map(String) : undefined,
  }
}

export function normalizeIntelligenceEvents(input: unknown): IntelligenceEvent[] {
  const items = Array.isArray(input) ? input : []
  return items.map(normalizeIntelligenceEvent).filter((item): item is IntelligenceEvent => item !== null)
}
