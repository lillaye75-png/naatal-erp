import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_ROUTES = ['/dashboard', '/products', '/customers', '/suppliers', '/sales', '/invoices', '/pos', '/purchases', '/inventory', '/debt', '/cash-register', '/reports', '/ecommerce', '/settings', '/categories', '/brands', '/units', '/warehouses', '/customer-groups', '/expenses', '/payments']
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/store']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  if (isProtected) {
    const session = request.cookies.get('__session')?.value
    if (!session) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon|sw.js|workbox-.*).*)",
  ],
}
