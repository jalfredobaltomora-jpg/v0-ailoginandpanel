import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/security';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/session',
  '/api/ai/chat',         // basic chat (no Firebase)
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/firebase-messaging-sw.js',
  '/icon',
  '/apple-icon',
];

// Paths that require admin
const ADMIN_PATHS = [
  '/api/ide/read-file',
  '/api/ide/write-file',
  '/api/ide/ai-assist',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (isPublicPath(pathname) || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Only protect API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Extract auth token
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
  }

  // Admin-only routes
  if (isAdminPath(pathname) && payload.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  // Add user info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Auth-User', JSON.stringify({
    uid: payload.uid,
    username: payload.username,
    codigo: payload.codigo,
    rol: payload.rol,
  }));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/:path*',
};
