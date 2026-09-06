import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    service: 'aegis-nexus-web',
    version: '5',
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
