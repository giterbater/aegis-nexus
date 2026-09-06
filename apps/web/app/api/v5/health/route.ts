import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const backendConfigured = Boolean(process.env.AEGIS_API_URL)
  const streamConfigured = Boolean(process.env.NEXT_PUBLIC_AEGIS_STREAM_URL)
  const configured = backendConfigured || streamConfigured

  return NextResponse.json({
    service: 'aegis-nexus-v5-realtime-gateway',
    version: '5',
    status: configured ? 'configured' : 'offline',
    transport: process.env.NEXT_PUBLIC_AEGIS_STREAM_TRANSPORT || 'sse',
    backendConfigured,
    streamConfigured,
    timestamp: new Date().toISOString(),
  }, { status: configured ? 200 : 503 })
}
