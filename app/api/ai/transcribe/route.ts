import { NextRequest, NextResponse } from 'next/server';
import { extractAuth, checkRateLimit, rateLimitResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Require auth
    const user = extractAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado', text: '' }, { status: 401 });
    }

    // Rate limiting: 20 per minute
    const rl = checkRateLimit(`transcribe:${user.uid}`, { windowMs: 60_000, maxRequests: 20 });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;
    const language = formData.get('language') as string || 'auto';

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided', text: '' }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Servicio no disponible', text: '' }, { status: 500 });
    }

    const buffer = await audio.arrayBuffer();
    let fileExt = 'webm';
    
    if (audio.type.includes('mp4')) fileExt = 'mp4';
    else if (audio.type.includes('wav')) fileExt = 'wav';
    else if (audio.type.includes('ogg')) fileExt = 'ogg';
    else if (audio.type.includes('aac')) fileExt = 'aac';
    
    const groqFormData = new FormData();
    const blob = new Blob([buffer], { type: audio.type || 'audio/webm' });
    groqFormData.append('file', blob, `audio.${fileExt}`);
    groqFormData.append('model', 'whisper-large-v3-turbo');
    
    if (language !== 'auto') {
      groqFormData.append('language', language);
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: groqFormData,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Error de transcripción', text: '' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      text: data.text || '',
      language: data.language || language,
      duration: data.duration,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno', text: '' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'transcription-api' });
}
