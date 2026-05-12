import { generateText, Output } from 'ai';
import { z } from 'zod';
import { LOGIN_VALIDATION_PROMPT } from '@/lib/ai-prompts';

const ValidationSchema = z.object({
  match: z.enum(['exact', 'similar', 'none']),
  matchedUser: z.string().nullable(),
  similarity: z.number(),
  suggestion: z.string(),
});

export async function POST(req: Request) {
  try {
    const { username, allUsers } = await req.json();
    
    if (!username || !allUsers || !Array.isArray(allUsers)) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Primero verificamos coincidencia exacta localmente
    const exactMatch = allUsers.find(
      (u: { username: string }) => u.username.toLowerCase() === username.toLowerCase()
    );
    
    if (exactMatch) {
      return Response.json({
        match: 'exact',
        matchedUser: exactMatch.username,
        similarity: 100,
        suggestion: 'Usuario reconocido. Por favor ingrese su PIN.',
      });
    }

    // Si no hay coincidencia exacta, usamos IA para detectar similitudes
    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({ schema: ValidationSchema }),
      prompt: `${LOGIN_VALIDATION_PROMPT}

Usuario ingresado: "${username}"
Usuarios registrados: ${JSON.stringify(allUsers.map((u: { username: string }) => u.username))}

Analiza y responde en JSON:`,
    });

    return Response.json(output);
  } catch (error) {
    console.error('Error in validate-login:', error);
    return Response.json({
      match: 'none',
      matchedUser: null,
      similarity: 0,
      suggestion: 'Error al validar. Por favor intente de nuevo.',
    });
  }
}
