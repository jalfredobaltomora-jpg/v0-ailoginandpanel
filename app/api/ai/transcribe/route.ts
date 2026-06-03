import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';

/**
 * Transcribe audio using Groq Whisper API
 * Supports multiple audio formats and languages
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;
    const language = formData.get('language') as string || 'auto';

    if (!audio) {
      return NextResponse.json(
        { error: 'No audio file provided', text: '' },
        { status: 400 }
      );
    }

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return NextResponse.json(
        { error: 'API key not configured', text: '' },
        { status: 500 }
      );
    }

    // Determine file extension and MIME type
    const buffer = await audio.arrayBuffer();
    let fileExt = 'webm';
    
    if (audio.type.includes('mp4')) fileExt = 'mp4';
    else if (audio.type.includes('wav')) fileExt = 'wav';
    else if (audio.type.includes('ogg')) fileExt = 'ogg';
    else if (audio.type.includes('aac')) fileExt = 'aac';
    
    // Create FormData for Groq API
    const groqFormData = new FormData();
    const blob = new Blob([buffer], { type: audio.type || 'audio/webm' });
    groqFormData.append('file', blob, `audio.${fileExt}`);
    groqFormData.append('model', 'whisper-large-v3-turbo');
    
    if (language !== 'auto') {
      groqFormData.append('language', language);
    }

    // Call Groq Whisper API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', response.status, errorData);
      return NextResponse.json(
        {
          error: 'Transcription failed',
          text: '',
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript = data.text || '';

    return NextResponse.json({
      text: transcript,
      language: data.language || language,
      duration: data.duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        text: '',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'transcription-api',
    timestamp: new Date().toISOString(),
  });
}
