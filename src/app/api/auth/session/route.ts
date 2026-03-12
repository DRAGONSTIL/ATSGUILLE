import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({})
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('auth_session_route_error', error)
    // Nunca romper el cliente de next-auth con texto plano o HTML
    return NextResponse.json({}, { status: 200 })
  }
}
