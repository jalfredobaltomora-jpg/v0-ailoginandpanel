import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/security';

const FB_URL = process.env.FIREBASE_DB_URL || 'https://system-control-administrative-default-rtdb.firebaseio.com';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 100 : Math.round((1 - dist / maxLen) * 100);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 20 per minute
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rl = checkRateLimit(`validate-login:${ip}`, { windowMs: 60_000, maxRequests: 20 });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { username } = await req.json();

    if (!username || username.length < 3) {
      return NextResponse.json({
        match: 'none', matchedUser: null, similarity: 0,
        suggestion: 'IA: Por favor ingrese al menos 3 caracteres.',
      });
    }

    // Server fetches its own user list — never trust client-supplied data
    let usernames: string[] = [];
    try {
      const res = await fetch(`${FB_URL}/usuarios-it.json`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          usernames = Object.values(data)
            .filter((u: any) => u.activo)
            .map((u: any) => u.username);
        }
      }
    } catch {}

    const input = username.toLowerCase().trim();

    // Exact match
    const exact = usernames.find(u => u.toLowerCase() === input);
    if (exact) {
      return NextResponse.json({
        match: 'exact', matchedUser: exact, similarity: 100,
        suggestion: 'IA: Usuario reconocido. Por favor ingrese su PIN.',
      });
    }

    // Prefix match
    const prefixUser = usernames.find(u => u.toLowerCase().startsWith(input));
    if (prefixUser) {
      return NextResponse.json({
        match: 'prefix', matchedUser: prefixUser, similarity: 0,
        suggestion: `IA: Coincide con "${prefixUser}"... siga escribiendo.`,
      });
    }

    // Fuzzy match
    const scored = usernames
      .map(u => ({ username: u, score: similarity(input, u) }))
      .filter(s => s.score >= 40)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= 70) {
      const best = scored[0];
      return NextResponse.json({
        match: 'similar', matchedUser: best.username, similarity: best.score,
        suggestion: `IA: Quizas quiso decir "${best.username}"? (${best.score}% de coincidencia)`,
      });
    }

    return NextResponse.json({
      match: 'none', matchedUser: null, similarity: 0,
      suggestion: 'IA: Usuario no encontrado en el sistema.',
    });
  } catch {
    return NextResponse.json({
      match: 'none', matchedUser: null, similarity: 0,
      suggestion: 'IA: Error de validación. Intente de nuevo.',
    });
  }
}
