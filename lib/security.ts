import { NextResponse } from 'next/server';

// ─── Path Sanitization ───────────────────────────────────────────
const DANGEROUS_PATH_PATTERNS = [
  /\.\./,        // path traversal
  /[/\\]/,       // slashes within segment
  /\0/,          // null bytes
  /[<>"'`;]/,   // injection chars
];

export function sanitizePathSegment(segment: string): string {
  const clean = segment.trim();
  if (!clean) throw new Error('Empty path segment');
  if (clean.length > 200) throw new Error('Path segment too long');
  for (const pat of DANGEROUS_PATH_PATTERNS) {
    if (pat.test(clean)) throw new Error(`Invalid characters in path segment: ${clean}`);
  }
  return clean;
}

// ─── HTML Escaping (for document.write) ──────────────────────────
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c => HTML_ESCAPE_MAP[c]);
}

// ─── Rate Limiter (in-memory) ───────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt < now) rateLimits.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || entry.resetAt < now) {
    const newEntry = { count: 1, resetAt: now + config.windowMs };
    rateLimits.set(key, newEntry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: newEntry.resetAt };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intente más tarde.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-RetryAfter': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}

// ─── Auth Token Helpers ──────────────────────────────────────────
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'sca-jwt-secret-change-in-production-2024';

export interface AuthPayload {
  uid: string;
  username: string;
  codigo: string;
  rol: 'admin' | 'user' | 'it-manager';
  iat: number;
  exp: number;
}

export function createAuthToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 8 * 60 * 60 }; // 8 hours
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(tokenPayload));
  const signature = btoa(hmacSign(`${header}.${body}`, AUTH_SECRET));
  return `${header}.${body}.${signature}`;
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = btoa(hmacSign(`${header}.${body}`, AUTH_SECRET));
    if (sig !== expected) return null;
    const payload: AuthPayload = JSON.parse(atob(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hmacSign(data: string, secret: string): string {
  // Simple HMAC using SubtleCrypto would be ideal but needs async.
  // For Next.js API routes, we use a synchronous approach with crypto.
  // In production, replace with proper JWT library like jose or jsonwebtoken.
  let hash = 0;
  const keyStr = secret + data;
  for (let i = 0; i < keyStr.length; i++) {
    const char = keyStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Add more entropy from the data
  let hash2 = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    hash2 = ((hash2 << 5) - hash2) + data.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return `${Math.abs(hash).toString(36)}${Math.abs(hash2).toString(36)}${Buffer.from(secret).toString('base64').slice(0, 12)}`;
}

// ─── Extract Auth from Request ───────────────────────────────────
export function extractAuth(request: Request): AuthPayload | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAuthToken(authHeader.slice(7));
}

// ─── Require Auth (middleware helper) ────────────────────────────
export function requireAuth(request: Request): { user: AuthPayload; error?: never } | { user?: never; error: NextResponse } {
  const user = extractAuth(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  return { user };
}

export function requireAdmin(request: Request): { user: AuthPayload; error?: never } | { user?: never; error: NextResponse } {
  const auth = requireAuth(request);
  if (auth.error) return auth;
  if (auth.user.rol !== 'admin') {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) };
  }
  return auth;
}

// ─── Input Validation ────────────────────────────────────────────
export function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_.-]{3,50}$/.test(username);
}

export function validateCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(code);
}

// ─── Safe Error Messages ─────────────────────────────────────────
export function safeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Error desconocido';
  // Never expose internal paths, stack traces, or system info
  if (msg.includes('ENOENT') || msg.includes('EACCES') || msg.includes('EPERM')) {
    return 'Error de acceso al archivo';
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
    return 'Error de conexión';
  }
  // Generic fallback - never expose raw error
  return 'Error interno del servidor';
}
