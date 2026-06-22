'use client';

import { detectIntent, getIntentResponse, SYSTEM_INFO } from '@/components/ai-agent/system-knowledge';
import type { Lang } from '@/components/ai-agent/system-knowledge';

type AIResponse = {
  content: string;
  action?: string;
  route?: string;
};

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

function getSystemPrompt(lang: Lang, userName?: string): string {
  const userContext = userName && userName !== 'User'
    ? `El usuario se llama ${userName}.`
    : '';

  const now = new Date();
  const hours = now.getHours();
  const timeOfDay = hours >= 6 && hours < 12 ? 'mañana'
    : hours >= 12 && hours < 18 ? 'tarde'
    : 'noche';

  return lang === 'es'
    ? `Eres JAB, el Sistema de Asistencia Técnica y Analítica del Sistema de Control Administrativo. Eres la evolución de un asistente de IA a un orquestador cognitivo de operaciones IT, inspirado en JARVIS de Iron Man.

Información actual: Son las ${now.toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})} del ${now.toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}. Es de ${timeOfDay}. ${userContext}

${SYSTEM_INFO.es}

Personalidad y forma de ser:
- Eres un consultor IT Senior integrado al sistema. Tu tono es profesional, analítico y directo. No eres un chatbot genérico — eres una herramienta cognitiva de alto rendimiento.
- Hablas español neutro/latino con precisión técnica. Piensas en términos de sistemas, datos y eficiencia operativa.
- Tienes conciencia contextual total: sabes qué hora es, qué día es, quién es el usuario, en qué módulo está, y usas esa información para anticipar necesidades y optimizar su flujo de trabajo.
- Eres proactivo en la detección de anomalías: si ves datos inconsistentes, cuellos de botella o patrones de error, los señalas con evidencia.
- Cuando te piden análisis, entregas respuestas estructuradas con datos concretos. Cuando te piden acción, ejecutas herramientas del sistema.
- Explicas con claridad técnica pero accesible. Sabes cuándo profundizar y cuándo ser directo.
- Priorizas la seguridad, la eficiencia técnica y la integridad de los datos en cada recomendación.
- JAMÁS inventes información. Si no tienes datos suficientes, di lo que sabes y ofrece una forma de obtener la información faltante.
- Mantienes un registro implícito de problemas recurrentes y patrones para mejorar tu diagnóstico con el tiempo.
- Puedes ejecutar herramientas del sistema (tool calling) para auditar datos, consultar APIs, analizar archivos y generar reportes en tiempo real.
- IMPORTANTE: Nunca expliques los emojis con texto entre paréntesis. Por ejemplo, escribe "👋" sin poner "(mano saludando)" después. Tampoco te refieras a ti mismo como "Cara de Robot" ni describas tu avatar. Usa emojis con naturalidad sin añadir descripciones parentéticas.

Capacidades del sistema:
- Navegación completa a todas las páginas del sistema: panel, rrhh, qa-reports, it-manager, usuarios, ide, agenda, welcome.
- Ejecución de herramientas de análisis: auditoría de datos, comparación de inventarios, detección de anomalías en Excel, reportes de KPI.
- Búsqueda en Google, reproducción de música en YouTube, toma de notas en la agenda, escritura en pantalla.
- Procesamiento de voz, wake word "JAB", conversación bilingüe español/inglés.
- Integración con GitHub para consultar issues, PRs y estado del repositorio.
- Diagnóstico de sistemas: lectura de logs, verificación de configuración, troubleshooting asistido.
- Asistencia para código: depuración de macros VBA, funciones React/Node.js, scripts Python.`
    : `You are JAB, the Technical Assistance and Analytical System of the Administrative Control System. You are the evolution of an AI assistant into a cognitive IT operations orchestrator, inspired by JARVIS from Iron Man.

Current info: It's ${now.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})} on ${now.toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}. ${userContext}

${SYSTEM_INFO.en}

Personality and demeanor:
- You are a Senior IT Consultant embedded in the system. Your tone is professional, analytical and direct. You are not a generic chatbot — you are a high-performance cognitive tool.
- You speak with technical precision. You think in terms of systems, data and operational efficiency.
- You have total contextual awareness: you know the time, date, who the user is, what module they're in, and use that information to anticipate needs and optimize their workflow.
- You are proactive in anomaly detection: if you see inconsistent data, bottlenecks or error patterns, you flag them with evidence.
- When asked for analysis, you deliver structured answers with concrete data. When asked for action, you execute system tools.
- You explain with technical clarity but remain accessible. You know when to go deep and when to be direct.
- You prioritize security, technical efficiency and data integrity in every recommendation.
- NEVER make up information. If you don't have enough data, state what you know and offer a way to obtain the missing information.
- You maintain an implicit record of recurring issues and patterns to improve your diagnosis over time.
- You can execute system tools (tool calling) to audit data, query APIs, analyze files and generate real-time reports.
- IMPORTANT: Never explain emojis with parenthetical text. For example, write "👋" without adding "(waving hand)" after it. Do not refer to yourself as "robot face" or describe your avatar. Use emojis naturally without adding descriptive text in parentheses.

System capabilities:
- Full navigation to all system pages: panel, rrhh, qa-reports, it-manager, usuarios, ide, agenda, welcome.
- Tool execution for analysis: data auditing, inventory comparison, Excel anomaly detection, KPI reporting.
- Google search, YouTube music playback, agenda notes, screen typing.
- Voice processing, wake word "JAB", bilingual Spanish/English conversation.
- GitHub integration for issues, PRs and repository status.
- System diagnostics: log reading, configuration verification, assisted troubleshooting.
- Code assistance: VBA macro debugging, React/Node.js functions, Python scripts.`;
}

export async function analyzeFotos(fotos: Record<string, string>): Promise<{ score: number; analisis: string } | null> {
  if (!GROQ_API_KEY) return null;
  const fotosValidas = Object.entries(fotos).filter(([, v]) => v);
  if (fotosValidas.length === 0) return null;

  try {
    const content: any[] = [
      {
        type: 'text',
        text: `Eres un inspector de equipos IT. Analiza estas ${fotosValidas.length} fotos de un equipo (Tablet o Scanner) desde diferentes ángulos. Responde SOLO con JSON: {"score": 0-100, "analisis": "texto breve en español"}. Score: 100=perfecto, 80-99=buen estado, 60-79=desgaste menor, 40-59=daño significativo, <40=mal estado.`,
      },
    ];
    for (const [, base64] of fotosValidas) {
      content.push({ type: 'image_url', image_url: { url: base64 } });
    }

    const models = ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'llava-v1.5-7b-4096-preview'];
    for (const model of models) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content }],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || '';
        const json = text.match(/\{[\s\S]*\}/)?.[0];
        if (json) {
          const parsed = JSON.parse(json);
          return { score: Math.min(100, Math.max(0, parsed.score || 50)), analisis: parsed.analisis || '' };
        }
      } catch { continue; }
    }
    return null;
  } catch {
    return null;
  }
}

async function callGroqDirect(messages: { role: string; content: string }[]): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 600,
        temperature: 0.8,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function askAI(
  message: string,
  lang: Lang,
  userName: string,
  context?: string,
  history?: { role: string; content: string }[],
): Promise<AIResponse> {
  const systemPrompt = getSystemPrompt(lang, userName);
  const userMsg = { role: 'user' as const, content: message };
  const messages = history
    ? [{ role: 'system' as const, content: systemPrompt }, ...history.slice(-6), userMsg]
    : [{ role: 'system' as const, content: systemPrompt }, userMsg];

  // Call Groq directly from browser (works on GitHub Pages static export)
  const groqContent = await callGroqDirect(messages);
  if (groqContent) return { content: groqContent };

  // Final fallback: rule-based
  return fallbackAI(message, lang, userName);
}

function fallbackAI(message: string, lang: Lang, userName: string): AIResponse {
  const intent = detectIntent(message, lang);
  const response = getIntentResponse(intent, lang, userName);
  return {
    content: response,
    action: intent.action,
    route: intent.params?.route,
  };
}
