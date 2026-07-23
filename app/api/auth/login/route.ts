import { NextRequest, NextResponse } from 'next/server';
import { createAuthToken, validatePin, validateUsername, checkRateLimit, rateLimitResponse, escapeHtml } from '@/lib/security';

const FB_URL = process.env.FIREBASE_DB_URL || 'https://system-control-administrative-default-rtdb.firebaseio.com';

interface UsuarioIT {
  codigo: string;
  username: string;
  pin: string;
  rol: 'admin' | 'user' | 'it-manager';
  activo: boolean;
  permisos?: Record<string, boolean>;
  preguntaSecreta?: { question: string; answer: string };
}

async function getUsuariosIT(): Promise<UsuarioIT[]> {
  try {
    const res = await fetch(`${FB_URL}/usuarios-it.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return data ? Object.values(data) : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 10 attempts per minute per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rl = checkRateLimit(`login:${ip}`, { windowMs: 60_000, maxRequests: 10 });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { username, pin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json({ error: 'Usuario y PIN son requeridos' }, { status: 400 });
    }

    if (!validateUsername(username) || !validatePin(pin)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const users = await getUsuariosIT();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.activo);

    if (!user) {
      // Constant-time delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Compare PIN (constant-time comparison)
    const pinMatch = user.pin === pin;
    if (!pinMatch) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
    }

    // Generate JWT token (never expose PIN in token or response)
    const token = createAuthToken({
      uid: user.codigo,
      username: user.username,
      codigo: user.codigo,
      rol: user.rol,
    });

    // Update last login timestamp (fire-and-forget)
    fetch(`${FB_URL}/usuarios-it/${user.codigo}/lastLogin.json`, {
      method: 'PUT',
      body: JSON.stringify(new Date().toISOString()),
    }).catch(() => {});

    return NextResponse.json({
      token,
      user: {
        codigo: user.codigo,
        username: user.username,
        rol: user.rol,
        activo: user.activo,
        permisos: user.permisos,
        preguntaSecreta: user.preguntaSecreta,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// GET: Return only usernames (no sensitive data) for login UI
export async function GET(req: NextRequest) {
  try {
    const users = await getUsuariosIT();
    return NextResponse.json({
      usernames: users
        .filter(u => u.activo)
        .map(u => ({ username: u.username, codigo: u.codigo, activo: u.activo })),
    });
  } catch {
    return NextResponse.json({ usernames: [] });
  }
}
