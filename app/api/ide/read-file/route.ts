import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'No path provided' }, { status: 400 });

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
