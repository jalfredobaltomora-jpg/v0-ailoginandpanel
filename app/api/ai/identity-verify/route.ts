import { streamText, convertToModelMessages } from 'ai';
import { buildIdentityPrompt } from '@/lib/ai-prompts';

export async function POST(req: Request) {
  try {
    const { messages, empleadoData, preguntaSecreta } = await req.json();
    
    if (!messages || !empleadoData) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    const systemPrompt = buildIdentityPrompt(empleadoData, preguntaSecreta);

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in identity-verify:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
