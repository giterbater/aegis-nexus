import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const backendUrl = () => process.env.AEGIS_STREAM_HTTP_URL || process.env.AEGIS_API_URL

export async function GET(req: NextRequest) {
  const base = backendUrl()
  if (!base) {
    return new Response(JSON.stringify({
      error: 'realtime_backend_not_configured',
      message: 'Configure AEGIS_STREAM_HTTP_URL or AEGIS_API_URL for live intelligence.',
      mode: 'OFFLINE',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  const upstream = `${base.replace(/\/$/, '')}/api/v1/events/stream`
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  req.signal.addEventListener('abort', onAbort)

  try {
    const response = await fetch(upstream, {
      headers: { Accept: 'text/event-stream' },
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      return new Response(JSON.stringify({ error: 'realtime_upstream_unavailable', status: response.status, mode: 'DEGRADED' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'realtime_upstream_connection_failed', mode: 'DEGRADED' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } finally {
    req.signal.removeEventListener('abort', onAbort)
  }
}
