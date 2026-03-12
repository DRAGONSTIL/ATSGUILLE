import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api', '/jobs', '/invite', '/_next', '/favicon.ico']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  if (!isPublicRoute) {
    // Check for NextAuth session token (cookie-based)
    const sessionToken =
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('x-request-id', requestId)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

