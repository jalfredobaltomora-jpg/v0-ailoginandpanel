import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  const { path: filePath, content } = await request.json();
  if (!filePath) return NextResponse.json({ error: 'No path provided' }, { status: 400 });

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
