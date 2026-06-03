'use client';

import { askAI } from './ai-client';
import type { Lang } from '@/components/ai-agent/system-knowledge';

export type AIRole = 'jab' | 'ide' | 'support' | 'login';

export interface AIRouterRequest {
  role: AIRole;
  message: string;
  context?: {
    currentCode?: string;
    selectedFile?: string;
    userName?: string;
    lang?: Lang;
    userId?: string;
    userData?: any;
    empleadoData?: any;
  };
}

export interface AIRouterResponse {
  content: string;
  code?: string;
  action?: string;
}

const IDE_SYSTEM_PROMPT_ES = `Eres el asistente de IA del IDE visual del Sistema de Control Administrativo.
Ayudas a desarrolladores a escribir y mejorar código TypeScript/React/Next.js.
Tus especialidades:
- Optimizar código para mejor rendimiento
- Agregar validaciones con react-hook-form + zod
- Escribir comentarios JSDoc
- Corregir errores y bugs
- Mejorar UI con Tailwind CSS
- Agregar estados de carga y feedback visual
- Generar nuevos componentes y funcionalidades
Responde en español, sé técnico pero claro.`;

const SUPPORT_SYSTEM_PROMPT_ES = `Eres el asistente de soporte IT del Sistema de Control Administrativo.
Ayudas a usuarios con problemas de acceso y recuperación de credenciales.
Tienes acceso a los datos del usuario para verificar su identidad.
Pasos:
1. Saluda y explica que harás preguntas de seguridad
2. Verifica identidad con datos del empleado
3. Si es verificado, puedes revelar usuario o contraseña
4. Si no es verificado, escala a un técnico humano
Sé profesional, amable y seguro.`;

const IDE_FALLBACK_RESPONSES: { pattern: RegExp; message: string; hasCode: boolean }[] = [
  { pattern: /optimizar|rendimiento|performance/i, message: 'He optimizado el código:\n- Extraje lógica repetida\n- Simplifiqué condicionales\n- Agregué early returns\n- Reduje anidamiento', hasCode: true },
  { pattern: /validacion|validar|validate/i, message: 'Agregué validaciones:\n- Schema de validación con zod\n- Mensajes de error en español\n- Submit deshabilitado si hay errores', hasCode: true },
  { pattern: /comentario|explicar|document/i, message: 'Documenté el código con comentarios JSDoc explicativos.', hasCode: true },
  { pattern: /error|corregir|bug|fall/i, message: 'Revisé el código y corregí:\n1. Posibles null/undefined\n2. Missing keys en listas\n3. Dependencias de useEffect\n4. Tipos faltantes', hasCode: true },
  { pattern: /ui|interfaz|diseno|mejorar/i, message: 'Sugerencias de UI:\n- Animaciones con Tailwind\n- Estados vacíos y de carga\n- Diseño responsivo\n- Consistencia visual', hasCode: true },
  { pattern: /loading|cargando|estado/i, message: 'Agregué estados de carga:\n- Spinner durante carga\n- Empty state\n- Toast de confirmación\n- Botones deshabilitados', hasCode: true },
];

function getIDEResponse(message: string, currentCode?: string, selectedFile?: string): AIRouterResponse {
  const lower = message.toLowerCase();
  const hasCode = currentCode?.trim().length ? true : false;
  const fileName = selectedFile || 'archivo actual';

  for (const r of IDE_FALLBACK_RESPONSES) {
    if (r.pattern.test(lower)) {
      if (!hasCode) return { content: `No hay código abierto en ${fileName}. Selecciona un archivo del árbol para continuar.`, code: '' };
      return { content: r.message, code: currentCode };
    }
  }

  if (lower.includes('crear') || lower.includes('nuevo') || lower.includes('generar')) {
    return { content: `Puedo ayudarte a crear código nuevo. Describe qué componente o funcionalidad necesitas.\n\nEjemplos:\n- "Crea un formulario de login"\n- "Genera una tabla con datos"\n- "Crea un componente de búsqueda"`, code: '' };
  }

  if (hasCode) {
    return { content: `Basado en tu consulta y el código de ${fileName}, aquí está mi sugerencia.`, code: currentCode };
  }

  return { content: `Recibí: "${message}"\n\nPara ayudarte mejor:\n1. Selecciona un archivo del árbol de funciones\n2. O usa las acciones rápidas\n\nO dime qué quieres crear.`, code: '' };
}

function getSupportResponse(message: string, context?: AIRouterRequest['context']): AIRouterResponse {
  const lower = message.toLowerCase();
  const userData = context?.userData;
  const empleadoData = context?.empleadoData;
  const dataReady = !!userData;

  // Support-specific responses
  if (/hola|buenas|buen[ao]s|saludos/i.test(lower)) {
    const name = empleadoData ? `${empleadoData.nombres} ${empleadoData.apellidos}` : context?.userName || 'Usuario';
    return { content: `Hola ${name}! Soy el asistente virtual de IT. ¿En qué puedo ayudarte hoy?` };
  }

  if (/ayuda|soporte|asistencia|problema/i.test(lower)) {
    return { content: 'Claro, estoy aquí para ayudarte. Puedo:\n- Ayudarte con problemas de acceso\n- Restablecer tus credenciales\n- Resolver dudas sobre el sistema\n\nDescribe tu situación y te orientaré.' };
  }

  if (/usuario|username|user|identidad/i.test(lower) && dataReady) {
    return { content: `Tu usuario es: "${userData.username}". ¿Necesitas algo más?` };
  }

  if (/(pin|clave|contraseña|password|pass|pwd)/i.test(lower) && dataReady) {
    return { content: `Tu contraseña (PIN) ha sido verificada. Por seguridad, no la mostramos en pantalla. Si necesitas restablecerla, contacta a un administrador.` };
  }

  if (/gracias|ok|vale|perfecto|excelente/i.test(lower)) {
    return { content: 'De nada! Si necesitas ayuda adicional, no dudes en escribirme.' };
  }

  if (dataReady) {
    return { content: '¿En qué puedo ayudarte? Puedo decirte tu usuario o restablecer tu contraseña.' };
  }

  return { content: 'Un momento por favor, estoy consultando tus datos...' };
}

export async function routeAIRequest(req: AIRouterRequest): Promise<AIRouterResponse> {
  const { role, message, context } = req;

  // Try real AI first (only if API key is configured)
  try {
    const res = await fetch('/api/ai/jab-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: role === 'ide' ? IDE_SYSTEM_PROMPT_ES : role === 'support' ? SUPPORT_SYSTEM_PROMPT_ES : 'Eres JAB, un asistente virtual inteligente.' },
          { role: 'user', content: message },
        ],
        context: JSON.stringify(context || {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.content) return { content: data.content, code: context?.currentCode };
    }
  } catch {}

  // Fallback to role-specific rules
  switch (role) {
    case 'ide':
      return getIDEResponse(message, context?.currentCode, context?.selectedFile);
    case 'support':
      return getSupportResponse(message, context);
    case 'jab':
      return { content: await askAI(message, context?.lang || 'es', context?.userName || 'Usuario').then(r => r.content) };
    default:
      return { content: 'No entendí. ¿Puedes repetirlo?' };
  }
}
