'use client';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

export async function transcribeAudio(blob: Blob, language?: string): Promise<string | null> {
  // Try API route first (works on Vercel)
  try {
    const fd = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('wav') ? 'wav' : 'webm';
    fd.append('audio', blob, `audio.${ext}`);
    if (language && language !== 'auto') fd.append('language', language);
    const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      if (data?.text) return data.text;
    }
  } catch {}

  // Fallback: call Groq Whisper API directly (works on static export / Capacitor)
  if (!GROQ_API_KEY) return null;
  try {
    const fd = new FormData();
    fd.append('file', blob, `audio.webm`);
    fd.append('model', 'whisper-large-v3-turbo');
    if (language && language !== 'auto') fd.append('language', language);
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: fd,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.text || null;
  } catch {
    return null;
  }
}
