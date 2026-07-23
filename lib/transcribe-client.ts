'use client';

export async function transcribeAudio(blob: Blob, language?: string): Promise<string | null> {
  // Only use server API route — never expose API keys in client
  try {
    const fd = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('wav') ? 'wav' : 'webm';
    fd.append('audio', blob, `audio.${ext}`);
    if (language && language !== 'auto') fd.append('language', language);
    const token = localStorage.getItem('sca_auth_token') || '';
    const res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.text) return data.text;
    }
  } catch {}
  return null;
}
