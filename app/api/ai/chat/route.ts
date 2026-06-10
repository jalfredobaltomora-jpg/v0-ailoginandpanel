const responses: { pattern: RegExp; reply: string }[] = [
  { pattern: /(hola|buenas|buen[ao]s|saludos)/i, reply: 'Hola! Soy el asistente virtual de IT. ¿En qué puedo ayudarte hoy?' },
  { pattern: /(ayuda|soporte|asistencia|problema)/i, reply: 'Claro, estoy aquí para ayudarte. Puedes consultarme sobre:\n- Problemas de acceso\n- Restablecimiento de credenciales\n- Dudas sobre el sistema\n\nDescribe tu situación y te orientaré.' },
  { pattern: /(usuario|username|acceder|login|ingresar)/i, reply: 'Si tienes problemas para acceder, puedo ayudarte con la verificación de identidad. Necesitaré hacerte algunas preguntas de seguridad para confirmar quién eres. ¿Estás de acuerdo?' },
  { pattern: /(pin|clave|contraseña|password|credencial)/i, reply: 'Para restablecer tu PIN, primero necesito verificar tu identidad. Por favor proporciona:\n1. Tus nombres completos\n2. Tu número de cédula\n3. El área donde trabajas' },
  { pattern: /(gracias|ok|vale|perfecto|excelente)/i, reply: 'De nada! Si necesitas ayuda adicional, no dudes en escribirme. Si el problema persiste, un técnico de IT se comunicará contigo pronto.' },
  { pattern: /(cedula|cedula|\d{3}-\d{6}-\d{4}[A-Z]?)/i, reply: 'Gracias. Ahora, para confirmar tu identidad, ¿podrías decirme cuál es tu área de trabajo y tu cargo actual?' },
  { pattern: /(tecnico|humano|persona|agente|escalar)/i, reply: 'Entiendo. Voy a escalar tu caso a un técnico de IT humano. Ellos revisarán tu solicitud y te atenderán a la brevedad. Mientras tanto, quédate atento a este chat.' },
];

function generateReply(message: string): string {
  const lower = message.toLowerCase().trim();

  // Check for exact patterns first
  for (const { pattern, reply } of responses) {
    if (pattern.test(lower)) {
      return reply;
    }
  }

  // Check for keyword matches
  const keywords = [
    { words: ['no puedo', 'no funciona', 'error', 'falla', 'bug'], reply: 'Lamento escuchar eso. Describe el error exacto que ves en pantalla y desde cuándo ocurre para poder ayudarte mejor.' },
    { words: ['acceso', 'permiso', 'bloqueado', 'restringido'], reply: 'Parece que tienes un problema de permisos. Puedo verificarlo si me confirmas tu nombre de usuario y área de trabajo.' },
    { words: ['olvide', 'olvido', 'recuperar', 'perdi', 'perdida'], reply: 'No te preocupes, es algo común. Voy a iniciar el proceso de verificación de identidad para restablecer tus credenciales.' },
    { words: ['fecha', 'cumpleaños', 'feliz', 'birthday'], reply: 'Si necesitas información sobre fechas especiales o cumpleaños, puedes consultarlo en el módulo de RRHH del panel.' },
    { words: ['foto', 'fotografia', 'imagen', 'subir'], reply: 'Para subir o actualizar tu foto de perfil, ve a RRHH > Catálogo, busca tu registro y haz doble clic. Ahí podrás cambiar tu foto.' },
  ];

  for (const { words, reply } of keywords) {
    if (words.some(w => lower.includes(w))) {
      return reply;
    }
  }

  return 'Gracias por tu mensaje. He registrado tu consulta. Si necesitas ayuda con algo específico, por favor indícamelo con más detalle y con gusto te asistiré.';
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || messages?.[messages.length - 1]?.text || '';

    const reply = generateReply(lastMessage);

    return Response.json({
      id: Date.now().toString(),
      role: 'assistant',
      content: reply,
    });
  } catch {
    return Response.json({
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Disculpa, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
    });
  }
}
