import { streamText, convertToModelMessages } from 'ai';
import { CHAT_SUPPORT_PROMPT } from '@/lib/ai-prompts';

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();
    
    if (!messages) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    const systemPrompt = context 
      ? `${CHAT_SUPPORT_PROMPT}\n\nContexto adicional:\n${context}`
      : CHAT_SUPPORT_PROMPT;

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
