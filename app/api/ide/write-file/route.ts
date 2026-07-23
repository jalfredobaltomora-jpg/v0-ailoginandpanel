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

export async function POST(request: NextRequest) {
  // Require auth
  const user = extractAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Only admin can write files
  if (user.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  // Rate limiting: 10 writes per minute
  const rl = checkRateLimit(`write-file:${user.uid}`, { windowMs: 60_000, maxRequests: 10 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const { path: filePath, content } = await request.json();
  if (!filePath) return NextResponse.json({ error: 'No path provided' }, { status: 400 });

  // Block sensitive files
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(filePath)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
  }

  try {
    const { writeFileSync, existsSync, mkdirSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const projectRoot = process.cwd();
    const resolved = resolve(projectRoot, filePath);

    if (!resolved.startsWith(projectRoot)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const dir = dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(resolved, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al guardar el archivo' }, { status: 500 });
  }
}
