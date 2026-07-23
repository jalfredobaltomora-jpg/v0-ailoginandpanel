import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/security';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = verifyAuthToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      codigo: payload.codigo,
      username: payload.username,
      rol: payload.rol,
    },
  });
}
