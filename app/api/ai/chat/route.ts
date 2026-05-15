const responses: { pattern: RegExp; reply: string }[] = [
  { pattern: /(hola|buenas|buen[ao]s|saludos)/i, reply: 'Hola! Soy el asistente virtual de IT. En que puedo ayudarte hoy?' },
  { pattern: /(ayuda|soporte|asistencia|problema)/i, reply: 'Claro, estoy aqui para ayudarte. Puedes consultarme sobre:\n- Problemas de acceso\n- Restablecimiento de credenciales\n- Dudas sobre el sistema\n\nDescribe tu situacion y te orientare.' },
  { pattern: /(usuario|username|acceder|login|ingresar)/i, reply: 'Si tienes problemas para acceder, puedo ayudarte con la verificacion de identidad. Necesitare hacerte algunas preguntas de seguridad para confirmar quien eres. Estas de acuerdo?' },
  { pattern: /(pin|clave|contraseña|password|credencial)/i, reply: 'Para restablecer tu PIN, primero necesito verificar tu identidad. Por favor proporciona:\n1. Tus nombres completos\n2. Tu numero de cedula\n3. El area donde trabajas' },
  { pattern: /(gracias|ok|vale|perfecto|excelente)/i, reply: 'De nada! Si necesitas ayuda adicional, no dudes en escribirme. Si el problema persiste, un tecnico de IT se comunicara contigo pronto.' },
  { pattern: /(cedula|cedula|\d{3}-\d{6}-\d{4}[A-Z]?)/i, reply: 'Gracias. Ahora, para confirmar tu identidad, podrias decirme cual es tu area de trabajo y tu cargo actual?' },
  { pattern: /(tecnico|humano|persona|agente|escalar)/i, reply: 'Entiendo. Voy a escalar tu caso a un tecnico de IT humano. Ellos revisaran tu solicitud y te atenderan a la brevedad. Mientras tanto, quedate atento a este chat.' },
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
    { words: ['no puedo', 'no funciona', 'error', 'falla', 'bug'], reply: 'Lamento escuchar eso. Describe el error exacto que ves en pantalla y desde cuando ocurre para poder ayudarte mejor.' },
    { words: ['acceso', 'permiso', 'bloqueado', 'restringido'], reply: 'Parece que tienes un problema de permisos. Puedo verificarlo si me confirmas tu nombre de usuario y area de trabajo.' },
    { words: ['olvide', 'olvido', 'recuperar', 'perdi', 'perdida'], reply: 'No te preocupes, es algo comun. Voy a iniciar el proceso de verificacion de identidad para restablecer tus credenciales.' },
    { words: ['fecha', 'cumpleaños', 'feliz', 'birthday'], reply: 'Si necesitas informacion sobre fechas especiales o cumpleaños, puedes consultarlo en el modulo de RRHH del panel.' },
    { words: ['foto', 'fotografia', 'imagen', 'subir'], reply: 'Para subir o actualizar tu foto de perfil, ve a RRHH > Catalogo, busca tu registro y haz doble clic. Ahi podras cambiar tu foto.' },
  ];

  for (const { words, reply } of keywords) {
    if (words.some(w => lower.includes(w))) {
      return reply;
    }
  }

  return 'Gracias por tu mensaje. He registrado tu consulta. Si necesitas ayuda con algo especifico, por favor indicamelo con mas detalle y con gusto te asistire.';
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
      content: 'Disculpa, ocurrio un error al procesar tu mensaje. Por favor intenta de nuevo.',
    });
  }
}
