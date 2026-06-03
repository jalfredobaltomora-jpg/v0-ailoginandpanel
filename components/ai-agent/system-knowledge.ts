export type Lang = 'es' | 'en';

export const LANG_LABELS: Record<Lang, string> = { es: 'Español', en: 'English' };

export function t(es: string, en: string, lang: Lang): string {
  return lang === 'es' ? es : en;
}

export interface PageInfo {
  route: string;
  label: Record<Lang, string>;
  description: Record<Lang, string>;
}

export const PAGES: PageInfo[] = [
  { route: '/panel/welcome', label: { es: 'Bienvenida', en: 'Welcome' }, description: { es: 'Pantalla de bienvenida con saludo, horario del día, y botón para entrar al panel principal', en: 'Welcome screen with greeting, daily schedule, and button to enter the main panel' } },
  { route: '/panel', label: { es: 'Panel Principal', en: 'Main Panel' }, description: { es: 'Menú principal con acceso a todos los módulos: RRHH, QA Reports, IT Manager', en: 'Main menu with access to all modules: HR, QA Reports, IT Manager' } },
  { route: '/panel/rrhh', label: { es: 'RRHH', en: 'HR' }, description: { es: 'Módulo de Recursos Humanos con catálogo de personal, cumpleañeros, reloj checador, permisos y asistencia', en: 'Human Resources module with employee catalog, birthdays, time clock, permissions and attendance' } },
  { route: '/panel/qa-reports', label: { es: 'QA Reports', en: 'QA Reports' }, description: { es: 'Reportes de calidad con extractor de datos, reporte semanal, reporte mensual, registro semanal y KPI reports', en: 'Quality reports with data extractor, weekly report, monthly report, weekly registry and KPI reports' } },
  { route: '/panel/it-manager', label: { es: 'IT Manager', en: 'IT Manager' }, description: { es: 'Gestión de IT con cola de soporte, gestión de usuarios, chat interno e IDE visual', en: 'IT management with support queue, user management, internal chat and visual IDE' } },
  { route: '/panel/it-manager/usuarios', label: { es: 'Usuarios IT', en: 'IT Users' }, description: { es: 'CRUD de usuarios del sistema con asignación de permisos por módulo', en: 'System users CRUD with module permission assignment' } },
  { route: '/panel/it-manager/ide', label: { es: 'IDE Visual', en: 'Visual IDE' }, description: { es: 'Entorno de desarrollo integrado con editor Monaco, árbol de archivos, vista previa y asistente AI', en: 'Integrated development environment with Monaco editor, file tree, preview panel and AI assistant' } },
  { route: '/panel/agenda', label: { es: 'Agenda', en: 'Agenda' }, description: { es: 'Notas diarias, historial general de notas por año, mes, semana y día, y resumen de tareas', en: 'Daily notes, general notes history by year, month, week and day, and task summary' } },
];

export const SYSTEM_INFO: Record<Lang, string> = {
  es: 'Sistema de Control Administrativo — una plataforma web integral para la gestión empresarial. Incluye: Módulo de Recursos Humanos (catálogo de personal, reloj checador con reconocimiento facial, permisos, cumpleaños), Reportes de Calidad QA (extractor de datos Excel, reportes semanales/mensuales, KPI dashboard con gráficas interactivas, BI Analytics), IT Manager (chat interno en tiempo real, gestión de usuarios, soporte técnico, IDE visual con editor Monaco y asistente AI), y Sistema de Alarmas Inteligentes (recordatorios de comida, salida, y alarmas personalizadas). Todo construido con Next.js 16, React 19, Firebase Realtime Database, TypeScript y Tailwind CSS. Totalmente responsivo, PWA, con modo oscuro y despliegue automatizado a GitHub Pages.',
  en: 'Administrative Control System — a comprehensive web platform for business management. Includes: Human Resources Module (employee catalog, facial recognition time clock, permissions, birthdays), QA Quality Reports (Excel data extractor, weekly/monthly reports, interactive KPI dashboard with charts, BI Analytics), IT Manager (real-time internal chat, user management, technical support, visual IDE with Monaco editor and AI assistant), and Smart Alarm System (lunch reminders, exit reminders, custom alarms). All built with Next.js 16, React 19, Firebase Realtime Database, TypeScript and Tailwind CSS. Fully responsive, PWA, dark mode, automated GitHub Pages deployment.',
};

export const FEATURES: { keywords: string[]; label: Record<Lang, string>; info: Record<Lang, string> }[] = [
  {
    keywords: ['bienvenida', 'welcome', 'inicio', 'home', 'entrar'],
    label: { es: 'Pantalla de Bienvenida', en: 'Welcome Screen' },
    info: { es: 'Muestra un saludo personalizado con nombre y foto del empleado, horario de entrada/salida, y el estado de comida. Pregunta la hora de almuerzo y la hora de salida los sábados. Agenda alarmas para recordar la salida y el almuerzo.', en: 'Shows a personalized greeting with employee name and photo, entry/exit schedule, and meal status. Asks for lunch time and Saturday exit time. Schedules alarms for lunch and exit reminders.' }
  },
  {
    keywords: ['rrhh', 'hr', 'recursos humanos', 'recursos', 'humanos', 'empleado', 'employee', 'personal', 'catalogo', 'catalog'],
    label: { es: 'Módulo RRHH', en: 'HR Module' },
    info: { es: 'Incluye: Catálogo de Personal con CRUD completo, fotos y filtros. Cumpleañeros del mes con conteo regresivo. Reloj checador con reconocimiento facial y PIN. Gestión de permisos con aprobación. Control de asistencia.', en: 'Includes: Employee Catalog with full CRUD, photos and filters. Monthly birthdays with countdown. Time clock with face recognition and PIN. Permission management with approval. Attendance control.' }
  },
  {
    keywords: ['qa reports', 'qa', 'calidad', 'quality', 'reportes', 'reports', 'extractor', 'kpi', 'weekly', 'mensual', 'monthly', 'semanal', 'registry'],
    label: { es: 'Módulo QA Reports', en: 'QA Reports Module' },
    info: { es: 'Incluye: Extractor de datos desde Excel a Firebase. Reporte Semanal de auditorías. Reporte Mensual de incidencias por punto. Registro Semanal de métricas por supervisor. KPI Reports con gráficas interactivas Chart.js, tabla dinámica, exportación a Excel y ventana BI con configuración de gráficos.', en: 'Includes: Data extractor from Excel to Firebase. Weekly audit report. Monthly incident report by point. Weekly registry of metrics by supervisor. KPI Reports with interactive Chart.js charts, dynamic table, Excel export, and BI window with chart configuration.' }
  },
  {
    keywords: ['it manager', 'it', 'soporte', 'support', 'tecnico', 'technical', 'usuario', 'user', 'ide', 'chat'],
    label: { es: 'Módulo IT Manager', en: 'IT Manager Module' },
    info: { es: 'Incluye: Cola de solicitudes de soporte con chat en tiempo real. Gestión de usuarios del sistema con permisos granulares por módulo. Chat interno entre empleados con mensajes de texto, imágenes y audio. IDE Visual con editor Monaco, preview y asistente AI para generar código.', en: 'Includes: Support request queue with real-time chat. System user management with granular permissions per module. Internal employee chat with text, images and audio messages. Visual IDE with Monaco editor, preview and AI assistant for code generation.' }
  },
  {
    keywords: ['alarma', 'alarm', 'recordatorio', 'reminder', 'comida', 'lunch', 'almuerzo', 'salida', 'exit'],
    label: { es: 'Alarmas y Recordatorios', en: 'Alarms & Reminders' },
    info: { es: 'El sistema agenda alarmas 10 minutos antes del almuerzo y 10 minutos antes de la hora de salida. Las alarmas se sincronizan entre dispositivos vía Firebase. El monitor de alarmas corre en segundo plano en todas las pantallas del panel.', en: 'The system schedules alarms 10 minutes before lunch and 10 minutes before exit time. Alarms sync across devices via Firebase. The alarm monitor runs in the background on all panel screens.' }
  },
  {
    keywords: ['audio', 'mensaje', 'message', 'chat', 'mensajeria', 'messaging'],
    label: { es: 'Chat Interno', en: 'Internal Chat' },
    info: { es: 'Sistema de mensajería en tiempo real entre empleados usando Firebase. Soporta mensajes de texto, imágenes, archivos y notas de audio. Las conversaciones se limpian automáticamente después de 90 días. Muestra notificaciones y estado de conexión.', en: 'Real-time messaging system between employees using Firebase. Supports text, images, files and audio notes. Conversations auto-clean after 90 days. Shows notifications and online status.' }
  },
  {
    keywords: ['login', 'acceso', 'iniciar', 'sesion', 'auth', 'autenticacion', 'authentication'],
    label: { es: 'Inicio de Sesión', en: 'Login' },
    info: { es: 'El acceso al sistema es por username + PIN de 6 dígitos. El username se valida con inteligencia artificial (corrección fuzzy con Levenshtein). El PIN se verifica contra Firebase. Los usuarios tienen roles: admin, user e it-manager con permisos granulares.', en: 'System access is by username + 6-digit PIN. Username is validated with AI (fuzzy Levenshtein correction). PIN is verified against Firebase. Users have roles: admin, user, and it-manager with granular permissions.' }
  },
];

export interface Intent {
  action: 'navigate' | 'info' | 'music' | 'time' | 'greet' | 'help' | 'unknown' | 'search' | 'typewrite' | 'scroll' | 'refreshPage' | 'note' | 'openSite' | 'logout' | 'copy' | 'screenshot' | 'editRecord';
  params?: Record<string, string>;
}

export function detectIntent(text: string, lang: Lang): Intent {
  const lower = text.toLowerCase().trim();

  // Greetings
  if (/\b(hola|buenas|buen[ao]s|saludos|hey|hi|hello|hey)\b/.test(lower)) {
    return { action: 'greet' };
  }

  // Time
  if (/\b(qu[eé] hora|hora|time|que hora|d[ií]me la hora|reloj|clock)\b/.test(lower)) {
    return { action: 'time' };
  }

  // Music / YouTube
  if (/\b(m[uú]sica|music|youtube|video|canci[oó]n|song|pon|play|reproduce)\b/.test(lower)) {
    return { action: 'music', params: { q: text } };
  }

  // System description
  if (/\b(sistema|system|panel|plataforma|platform|de qu[eé] trata|what is this|consiste|qu[eé] hace esta|qu[eé] es|what is|describe|descripci[oó]n)\b/.test(lower) && /\b(sistema|system|panel|plataforma|platform|app|aplicaci[oó]n|application|project|proyecto|software|p[aá]gina|page)\b/.test(lower)) {
    return { action: 'info', params: { feature: '__system__' } };
  }

  // Search Google/YouTube
  if (/\b(busca|buscar|search|google|investiga)\b/.test(lower)) {
    return { action: 'search', params: { q: text.replace(/\b(busca|buscar|search|google|investiga|en google|en internet)\b/gi, '').trim() } };
  }

  // Open specific website
  if (/\b(abre|abrir|open|visita|visit)\b.*\b(sitio|site|web|p[aá]gina|url)\b/.test(lower)) {
    return { action: 'openSite', params: { q: text } };
  }
  const urlMatch = lower.match(/\b(abre|abrir|open)\s+(google|youtube|gmail|drive|maps|github|facebook|instagram|twitter|whatsapp|netflix|spotify|linkedin)\b/);
  if (urlMatch) {
    const sites: Record<string,string> = {
      google:'https://google.com', youtube:'https://youtube.com', gmail:'https://mail.google.com',
      drive:'https://drive.google.com', maps:'https://maps.google.com', github:'https://github.com',
      facebook:'https://facebook.com', instagram:'https://instagram.com', twitter:'https://twitter.com',
      whatsapp:'https://web.whatsapp.com', netflix:'https://netflix.com', spotify:'https://spotify.com',
      linkedin:'https://linkedin.com',
    };
    const site = sites[urlMatch[2].toLowerCase()];
    if (site) return { action: 'openSite', params: { url: site, name: urlMatch[2] } };
  }

  // Type / write
  if (/\b(escribe|escribir|type|write|teclea|pon)\b/.test(lower)) {
    const textToType = text.replace(/\b(escribe|escribir|type|write|teclea|pon|esto|texto|lo siguiente|lo que sigue)\b/gi, '').trim();
    if (textToType) return { action: 'typewrite', params: { text: textToType } };
  }

  // Scroll
  if (/\b(despl[aá]zate|scroll|sube|baja|arriba|abajo|up|down)\b/.test(lower)) {
    if (/\b(arriba|sube|up|top|principio|inicio)\b/.test(lower)) return { action: 'scroll', params: { direction: 'up' } };
    if (/\b(abajo|baja|down|bottom|final)\b/.test(lower)) return { action: 'scroll', params: { direction: 'down' } };
    return { action: 'scroll', params: { direction: 'down' } };
  }

  // Refresh page
  if (/\b(actualiza|actualizar|refresh|recarga|recargar|reload)\b/.test(lower)) {
    return { action: 'refreshPage' };
  }

  // Copy (to clipboard simulation)
  if (/\b(copia|copiar|copy|clipboard|portapapeles)\b/.test(lower)) {
    return { action: 'copy' };
  }

  // Screenshot
  if (/\b(screenshot|captura|captura de pantalla|screen|pantallazo)\b/.test(lower)) {
    return { action: 'screenshot' };
  }

  // Note / reminder
  if (/\b(nota|note|apunta|apuntar|recordatorio|reminder|guarda esto|save)\b/.test(lower)) {
    const noteText = text.replace(/\b(nota|note|apunta|apuntar|recordatorio|reminder|guarda esto|save)\b/gi, '').trim();
    return { action: 'note', params: noteText ? { text: noteText } : undefined };
  }

  // Logout
  if (/\b(cierra sesi[oó]n|logout|log out|salir|cerrar sesi[oó]n|sign out)\b/.test(lower)) {
    return { action: 'logout' };
  }

  // Navigation - try PAGES labels/descriptions
  if (/\b(ir |lleva|navega|abre|open|go to|take me|navigate|show|dirige|vamos a|vamos|muestra|mostrar)\b/.test(lower)) {
    for (const page of PAGES) {
      const labels = Object.values(page.label).map(l => l.toLowerCase());
      const descs = Object.values(page.description).map(d => d.toLowerCase());
      const all = [...labels, ...descs];
      for (const kw of all) {
        if (lower.includes(kw)) return { action: 'navigate', params: { route: page.route } };
      }
    }
  }
  if (/\b(bienvenida|welcome|inicio|home|panel principal|main panel)\b/.test(lower)) {
    if (/panel principal/i.test(lower) || /main panel/i.test(lower)) return { action: 'navigate', params: { route: '/panel' } };
    return { action: 'navigate', params: { route: '/panel/welcome' } };
  }
  if (/\b(rrhh|recursos humanos|humanos|hr|empleados?|personal|catalogo)\b/.test(lower)) return { action: 'navigate', params: { route: '/panel/rrhh' } };
  if (/\b(qa|quality|calidad|reportes?|kpi|dashboard|graficas|graficos|chart)\b/.test(lower)) return { action: 'navigate', params: { route: '/panel/qa-reports' } };
  if (/\b(it manager|it\b|soporte|support|tecnico|ti)\b/.test(lower)) return { action: 'navigate', params: { route: '/panel/it-manager' } };
  if (/\b(usuarios|users|cuentas?)\b/.test(lower)) return { action: 'navigate', params: { route: '/panel/it-manager/usuarios' } };
  if (/\b(ide|editor|c[oó]digo|code|programar|monaco)\b/.test(lower)) return { action: 'navigate', params: { route: '/panel/it-manager/ide' } };
  if (/\b(agenda|notas diarias|mis notas|daily notes|notas)\b/.test(lower)) return { action: 'navigate', params: { route: '/panel/agenda' } };

  // Help / info about features
  for (const feat of FEATURES) {
    for (const kw of feat.keywords) {
      if (lower.includes(kw)) return { action: 'info', params: { feature: kw } };
    }
  }

  if (/\b(ayuda|help|qu[eé] puedes|what can you|funciones|c[oó]mo|how to|qu[eé] hace)\b/.test(lower)) {
    return { action: 'help' };
  }

  // Edit records (employees, users, notes)
  if (/\b(edita|editar|modifica|modificar|cambia|cambiar|actualiza|actualizar|update)\b/i.test(lower)) {
    const target = text.replace(/\b(edita|editar|modifica|modificar|cambia|cambiar|actualiza|actualizar|update|a\s)\b/gi, '').trim();
    const entity = /\b(nota|note|notas)\b/i.test(lower) ? 'note'
      : /\b(usuario|user|usuarios|users)\b/i.test(lower) ? 'user'
      : 'employee';
    return { action: 'editRecord', params: { entity, target } };
  }

  return { action: 'unknown' };
}

export function getIntentResponse(intent: Intent, lang: Lang, userName: string): string {
  switch (intent.action) {
    case 'greet': {
      const hours = new Date().getHours();
      let timeGreeting: Record<Lang, string>;
      if (hours < 12) timeGreeting = { es: 'Buenos días', en: 'Good morning' };
      else if (hours < 18) timeGreeting = { es: 'Buenas tardes', en: 'Good afternoon' };
      else timeGreeting = { es: 'Buenas noches', en: 'Good evening' };
      return lang === 'es'
        ? `${timeGreeting.es} ${userName}! Mi nombre es JAB 🤖 Estoy aquí para ayudarte. Puedes pedirme: navegar, buscar en Google, poner música, escribir texto, tomar notas, abrir sitios web, o controlar la pantalla. ¿En qué puedo ayudarte?`
        : `${timeGreeting.en} ${userName}! My name is JAB 🤖 I'm here to help. You can ask me: navigate, search Google, play music, type text, take notes, open websites, or control the screen. How can I help you?`;
    }
    case 'time': {
      const now = new Date();
      const timeStr = now.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return lang === 'es'
        ? `Son las ${timeStr} del ${dateStr}`
        : `It's ${timeStr} on ${dateStr}`;
    }
    case 'music': {
      return lang === 'es'
        ? 'Abriendo el reproductor de música. Dame el nombre de la canción o un enlace de YouTube.'
        : 'Opening the music player. Give me the song name or a YouTube link.';
    }
    case 'search': {
      const q = intent.params?.q || '';
      return lang === 'es'
        ? `Buscando "${q}" en Google. Abriendo resultados...`
        : `Searching "${q}" on Google. Opening results...`;
    }
    case 'openSite': {
      const name = intent.params?.name || intent.params?.url || '';
      return lang === 'es'
        ? `Abriendo ${name}...`
        : `Opening ${name}...`;
    }
    case 'typewrite': {
      return lang === 'es'
        ? 'Escribiendo el texto en la pantalla...'
        : 'Typing the text on screen...';
    }
    case 'scroll': {
      const dir = intent.params?.direction === 'up' ? (lang === 'es' ? 'arriba' : 'up') : (lang === 'es' ? 'abajo' : 'down');
      return lang === 'es'
        ? `Desplazándome ${dir}...`
        : `Scrolling ${dir}...`;
    }
    case 'refreshPage': {
      return lang === 'es'
        ? 'Actualizando la página...'
        : 'Refreshing the page...';
    }
    case 'copy': {
      return lang === 'es'
        ? 'Texto copiado al portapapeles 📋'
        : 'Text copied to clipboard 📋';
    }
    case 'screenshot': {
      return lang === 'es'
        ? 'Lo siento, la captura de pantalla no está disponible en la versión web. Prueba con la tecla Impr Pant de tu teclado.'
        : 'Sorry, screenshot is not available in the web version. Try using your Print Screen key.';
    }
    case 'note': {
      const noteText = intent.params?.text;
      if (noteText) return lang === 'es' ? `Nota guardada: "${noteText}" 📝` : `Note saved: "${noteText}" 📝`;
      return lang === 'es' ? 'Dime qué texto quieres guardar como nota.' : 'Tell me what text you want to save as a note.';
    }
    case 'logout': {
      return lang === 'es'
        ? 'Cerrando sesión... Vuelve pronto!'
        : 'Logging out... See you later!';
    }
    case 'navigate': {
      const route = intent.params?.route || '/panel';
      const pageName = PAGES.find(p => p.route === route);
      const nameStr = pageName ? pageName.label[lang] : route;
      return lang === 'es'
        ? `Te llevo a ${nameStr}...`
        : `Taking you to ${nameStr}...`;
    }
    case 'info': {
      const kw = intent.params?.feature || '';
      if (kw === '__system__') return SYSTEM_INFO[lang];
      const feat = FEATURES.find(f => f.keywords.includes(kw));
      if (feat) return feat.info[lang];
      return lang === 'es' ? 'No encontré información específica sobre eso.' : 'I couldn\'t find specific information about that.';
    }
    case 'help': {
      if (lang === 'es') {
        return 'Puedes pedirme:\n• Navegar: "Llévame a RRHH" "Abre QA Reports"\n• Buscar: "Busca recetas de cocina" "Google clima"\n• Música: "Pon música" "Reproduce Despacito"\n• Escribir: "Escribe Hola mundo" "Type Hello"\n• Scroll: "Desplázate abajo" "Sube"\n• Notas: "Nota Comprar leche" "Apunta esto"\n• Abrir sitios: "Abre YouTube" "Open Google"\n• Actualizar página: "Actualiza" "Refresh"\n• Salir: "Cierra sesión"\n• Hora: "Qué hora es"\n• También hablo inglés si cambias el idioma.';
      }
      return 'You can ask me:\n• Navigate: "Take me to HR" "Open QA Reports"\n• Search: "Search pizza recipes" "Google weather"\n• Music: "Play music" "Play Despacito"\n• Type: "Type Hello world"\n• Scroll: "Scroll down" "Go up"\n• Notes: "Note Buy milk"\n• Open sites: "Open YouTube" "Open Google"\n• Refresh: "Refresh page"\n• Logout: "Log out"\n• Time: "What time is it"\n• I also speak Spanish if you switch the language.';
    }
    case 'editRecord': {
      const entity = intent.params?.entity || 'employee';
      return lang === 'es'
        ? `Claro, buscando ${entity === 'note' ? 'la nota' : entity === 'user' ? 'el usuario' : 'el empleado'}...`
        : `Sure, looking for the ${entity}...`;
    }
    default: {
      if (lang === 'es') {
        return 'No entendí bien. Di "Ayuda" para ver todo lo que puedo hacer.';
      }
      return 'I didn\'t understand. Say "Help" to see everything I can do.';
    }
  }
}
