import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null)
    if (payload) {
      console.error('nextauth_client_log', payload)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('nextauth_client_log_error', error)
    return NextResponse.json({ ok: true })
  }
}
