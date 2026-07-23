import { NextResponse } from 'next/server';
import { TOOL_DEFINITIONS, executeTool } from '@/lib/tools';
import { buildMemoryContext, learnFromInteraction, recordFact, recordSession } from '@/lib/memory';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

async function callAIWithTools(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
): Promise<{ content?: string; tool_calls?: any[] } | null> {
  try {
    const body: any = {
      model,
      messages: messages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
      max_tokens: 800,
      temperature: 0.7,
      tools: TOOL_DEFINITIONS.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: t.parameters,
            required: t.required || [],
          },
        },
      })),
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    if (!msg) return null;
    return {
      content: msg.content || undefined,
      tool_calls: msg.tool_calls,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    let systemMsg = messages.find((m: Message) => m.role === 'system')?.content || '';
    const chatMessages = messages.filter((m: Message) => m.role !== 'system');

    // Inject memory context into system prompt
    const memoryCtx = await buildMemoryContext();
    if (memoryCtx) {
      systemMsg += `\n\nContexto de memoria:\n${memoryCtx}`;
    }

    const fullMessages: Message[] = systemMsg
      ? [{ role: 'system', content: systemMsg }, ...chatMessages]
      : chatMessages;

    // Get the last user message for auto-learning
    const lastUserMsg = [...chatMessages].reverse().find(m => m.role === 'user')?.content || '';

    async function processAndRespond(apiKey: string, baseUrl: string, model: string, msgs: Message[]): Promise<Response | null> {
      const result = await callAIWithTools(baseUrl, apiKey, model, msgs);
      if (!result) return null;

      let finalContent = result.content;

      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolResults = [];
        for (const tc of result.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          const toolResult = await executeTool(tc.function.name, args);
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          });
        }

        const finalMessages: Message[] = [
          ...msgs,
          { role: 'assistant' as const, content: result.content || '', tool_calls: result.tool_calls },
          ...toolResults,
        ];

        const finalResult = await callAIWithTools(baseUrl, apiKey, model, finalMessages);
        if (finalResult?.content) finalContent = finalResult.content;
      }

      if (finalContent) {
        // Auto-learn from this interaction
        learnFromInteraction(lastUserMsg, finalContent).catch(() => {});
        return NextResponse.json({ content: finalContent });
      }
      return null;
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const resp = await processAndRespond(groqKey, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', fullMessages);
      if (resp) return resp;
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const resp = await processAndRespond(openaiKey, 'https://api.openai.com/v1', 'gpt-4o-mini', fullMessages);
      if (resp) return resp;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const userMsg = chatMessages.map((m: Message) => m.content).join('\n');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemMsg ? `${systemMsg}\n\nUsuario: ${userMsg}` : userMsg }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return NextResponse.json({ content: text });
      }
    }

    return NextResponse.json({ content: '' });
  } catch {
    return NextResponse.json({ content: '' });
  }
}
