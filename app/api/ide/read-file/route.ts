import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, checkRateLimit, rateLimitResponse, safeError } from '@/lib/security';

// Blocked file patterns
const BLOCKED_PATTERNS = [
  /\.env/i,
  /node_modules/,
  /\.git\//,
  /firebase\.json/,
  /database\.rules/,
  /package-lock/,
  /\.next\//,
  /middleware\.ts/,
  /auth-store/,
  /auth\/login/,
  /auth\/session/,
  /security\.ts/,
];

export async function GET(request: NextRequest) {
  // Require auth
  const user = extractAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Rate limiting: 30 requests per minute
  const rl = checkRateLimit(`read-file:${user.uid}`, { windowMs: 60_000, maxRequests: 30 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'No path provided' }, { status: 400 });

  // Block sensitive files
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filePath)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
  }

  try {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const projectRoot = process.cwd();
    const resolved = resolve(projectRoot, filePath);

    if (!resolved.startsWith(projectRoot)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const content = readFileSync(resolved, 'utf-8');
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }
}
