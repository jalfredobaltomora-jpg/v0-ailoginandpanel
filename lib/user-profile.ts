'use client';

/**
 * ─── Perfil de aprendizaje del usuario para JAB ───
 *
 * JAB aprende con el tiempo de cada usuario logueado: su forma de hablar
 * (tuteo/formalidad, idioma, longitud de frases, tono), los temas/acciones
 * que pide con frecuencia, y los módulos que más visita.
 *
 * El perfil se persiste en Firebase Realtime Database (bajo
 * preferences/{userCode}/jab-profile) para que sea independiente del
 * dispositivo: si el usuario se loguea en otro equipo, JAB ya lo conoce.
 * localStorage se usa solo como caché local para lectura instantánea.
 */

import { db, ref, get, set } from './firebase';

export interface UserProfile {
  userId: string;
  userName: string;
  style: {
    /** 'tu' si el usuario tutea, 'usted' si es formal, null si aún no claro. */
    formality: 'tu' | 'usted' | null;
    /** idioma predominante (es/en). */
    lang: 'es' | 'en';
    /** longitud promedio de los mensajes del usuario: corto | medio | largo. */
    messageLength: 'corto' | 'medio' | 'largo';
    /** tono estimado según palabras utilizadas. */
    tone: 'amable' | 'neutral' | 'directo' | null;
    /** palabras frecuentes del usuario (solo las significativas). */
    palabrasFrecuentes: string[];
  };
  /** temas/acciones que el usuario pide con frecuencia (contados). */
  temas: Record<string, number>;
  /** módulos que el usuario visita con frecuencia. */
  modulos: Record<string, number>;
  /** total de interacciones registradas. */
  interactions: number;
  /** última referencia del perfil. */
  updatedAt: number;
}

const CACHE_KEY = 'jab-user-profile-cache';

const LEN_STOP = new Set(['que', 'para', 'como', 'estoy', 'quiero', 'con', 'los', 'las', 'una', 'por', 'de', 'a', 'el', 'la', 'y', 'en']);

function emptyProfile(userId: string, userName: string): UserProfile {
  return {
    userId,
    userName,
    style: { formality: null, lang: 'es', messageLength: 'corto', tone: null, palabrasFrecuentes: [] },
    temas: {},
    modulos: {},
    interactions: 0,
    updatedAt: Date.now(),
  };
}

function cacheKeyFor(userId: string): string {
  return `${CACHE_KEY}:${userId}`;
}

// ─── Caché local (lectura/escritura instantánea) ───

function readCache(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKeyFor(userId));
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {}
  return null;
}

function writeCache(p: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(cacheKeyFor(p.userId), JSON.stringify(p));
  } catch {}
}

function profilePath(userId: string): string {
  return `preferences/${userId}/jab-profile`;
}

/**
 * Lee el perfil. Primero devuelve la caché local (instantáneo), y carga el
 * definitivo desde Firebase para asegurarse de tener el perfil más reciente
 * aunque el usuario se haya logueado antes en otro dispositivo.
 */
export function getProfile(userId: string, userName: string): UserProfile {
  const cached = readCache(userId);
  if (cached) return cached;
  const fresh = emptyProfile(userId, userName);
  writeCache(fresh);
  return fresh;
}

/** Devuelve el perfil definitivo desde Firebase Realtime Database (o null). */
export async function fetchProfileFromCloud(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await get(ref(db, profilePath(userId)));
    return snap?.val() ? (snap.val() as UserProfile) : null;
  } catch (e) {
    console.warn('JAB: no se pudo leer perfil de la nube', e);
    return null;
  }
}

declare global {
  interface Window {
    __jabProfileLoaded?: (p: UserProfile | null) => void;
  }
}

/**
 * Sincroniza el perfil con la nube: si Firebase tiene un perfil más reciente
 * (por ej. otro dispositivo), lo usa y actualiza la caché local.
 */
export function hydrateProfileFromCloud(userId: string, userName: string): Promise<UserProfile> {
  return fetchProfileFromCloud(userId).then((cloud) => {
    const local = readCache(userId);
    if (cloud && cloud.userId === userId) {
      // Empezar con lo que el usuario ya haya acumulado localmente si es mayor,
      // de lo contrario usar el de la nube (prevalece el más avanzado).
      if (!local || (cloud.interactions ?? 0) >= (local.interactions ?? 0)) {
        writeCache(cloud);
        return cloud;
      }
      // El local tiene más interacciones: guardar hacia la nube.
      saveProfileToCloud(local).catch(() => {});
      return local;
    }
    const base = local || emptyProfile(userId, userName);
    writeCache(base);
    return base;
  });
}

/** Persiste el perfil en la nube (best-effort, nunca lanza). */
export function saveProfileToCloud(p: UserProfile): Promise<void> {
  try {
    return set(ref(db, profilePath(p.userId)), p);
  } catch (e) {
    return Promise.reject(e);
  }
}

function saveProfile(p: UserProfile) {
  p.updatedAt = Date.now();
  p.userName = p.userName;
  writeCache(p);
  // Persistir en la nube sin bloquear el flujo.
  set(ref(db, profilePath(p.userId)), p).catch((e) =>
    console.warn('JAB: no se pudo guardar perfil en la nube', e)
  );
}

/** Analiza una frase y actualiza el estilo de habla del perfil. */
function learnStyle(p: UserProfile, text: string) {
  const lower = text.toLowerCase().trim();
  if (!lower) return;
  const words = lower.match(/[a-záéíóúñü]+/g) || [];

  // Tuteo vs formalidad
  const informal = /\b(tu|t[uú]|eres|est[áa]s|puedes|hazme|dame|d[ií]me|quieres)\b/.test(lower);
  const formal = /\b(usted|sabe|puede|har[aá]|ser[aá]|quisiera|podr[íi]a|favor de)\b/.test(lower);
  if (informal && !formal) p.style.formality = 'tu';
  else if (formal && !informal) p.style.formality = 'usted';

  // Tono
  if (/\b(gracias|por favor|te agradezco|buena|excelente|genial)\b/.test(lower)) p.style.tone = 'amable';
  else if (/\b(ya|rapido|r[aá]pido|necesito ahora|inmediato|hazlo|ya mismo)\b/.test(lower)) p.style.tone = 'directo';
  else if (p.style.tone === null) p.style.tone = 'neutral';

  // Longitud media (ponderada)
  const wc = words.length;
  if (wc <= 5) p.style.messageLength = p.style.messageLength === 'largo' ? 'medio' : p.style.messageLength;
  else if (wc <= 20) p.style.messageLength = p.style.messageLength === 'corto' ? 'medio' : p.style.messageLength || 'medio';
  else p.style.messageLength = p.style.messageLength === 'corto' ? 'medio' : 'largo';

  // Palabras frecuentes (excluyendo vacías y muy genéricas)
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!w || w.length < 3 || LEN_STOP.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  const top = Object.entries(freq)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
  if (top.length) p.style.palabrasFrecuentes = top;
}

const TOPIC_PATTERNS: Record<string, RegExp> = {
  navegacion: /\b(ll[eé]vame|navega|abre|ir a|vamos a|muestra|entra)\b/i,
  analisis: /\b(analiza|analizar|resumen|m[eé]tricas|cu[áa]ntos|c[oó]mo va|estad[ií]sticas)\b/i,
  reportes: /\b(reporte|report|exporta|pdf|excel|csv|descargar)\b/i,
  empleados: /\b(emplead|personal|cumplea[nñ]|quien es|dame datos)\b/i,
  horario: /\b(hora|reloj|checador|asistencia|permiso|salida|almuerzo)\b/i,
  soporte: /\b(soporte|ayuda con si|incidente|problema con|no funciona)\b/i,
  musica: /\b(m[uú]sica|video|youtube|cancion)\b/i,
  notas: /\b(nota|apunta|recordatorio)\b/i,
};

/** Registra un tema detectado en la frase del usuario. */
function learnTopic(p: UserProfile, text: string) {
  for (const [topic, re] of Object.entries(TOPIC_PATTERNS)) {
    if (re.test(text)) p.temas[topic] = (p.temas[topic] || 0) + 1;
  }
}

/** Registra la visita a un módulo y lo persiste en la nube. */
export function learnModuleVisited(userId: string, userName: string, route: string) {
  if (!userId) return;
  const p = getProfile(userId, userName);
  const mod = route === '/panel/rrhh' ? 'rrhh'
    : route === '/panel/qa-reports' ? 'qa'
    : route === '/panel/it-manager' ? 'it'
    : route === '/panel/agenda' ? 'agenda'
    : 'principal';
  p.modulos[mod] = (p.modulos[mod] || 0) + 1;
  saveProfile(p);
}

/**
 * Registra un aprendizaje a partir de un mensaje del usuario:
 * estilo de habla, tema y contador de interacciones.
 */
export function learnFromMessage(userId: string, userName: string, text: string) {
  if (!userId || !text.trim()) return;
  const p = getProfile(userId, userName);
  p.interactions += 1;
  learnStyle(p, text);
  learnTopic(p, text);
  saveProfile(p);
}

/** Serializa el perfil en texto legible para inyectar en el prompt del LLM. */
export function profileToPrompt(p: UserProfile, lang: 'es' | 'en'): string {
  const style = p.style;
  const lines: string[] = [];

  const formalityLabel = style.formality === 'tu'
    ? (lang === 'es' ? 'tuteo (informal/amable)' : 'informal (you)')
    : style.formality === 'usted'
      ? (lang === 'es' ? 'formal (usted)' : 'formal')
      : (lang === 'es' ? 'indeterminado (mézclalo naturalmente)' : 'indeterminate (mix naturally)');
  const toneLabel = style.tone === 'amable'
    ? (lang === 'es' ? 'amable y cálido' : 'friendly and warm')
    : style.tone === 'directo'
      ? (lang === 'es' ? 'directo y conciso' : 'direct and concise')
      : (lang === 'es' ? 'neutral' : 'neutral');
  const lengthLabel = style.messageLength === 'corto'
    ? (lang === 'es' ? 'frases cortas' : 'short phrases')
    : style.messageLength === 'largo'
      ? (lang === 'es' ? 'frases largas y detalladas' : 'long, detailed phrases')
      : (lang === 'es' ? 'frases de longitud media' : 'medium-length phrases');

  lines.push(lang === 'es'
    ? `El usuario prefiere ${formalityLabel}, tono ${toneLabel}, y suele escribir ${lengthLabel}.`
    : `The user prefers ${formalityLabel}, a ${toneLabel} tone, and usually writes ${lengthLabel}.`);

  const maxTopic = Object.values(p.temas).reduce((a, b) => Math.max(a, b), 0);
  const topTopics = Object.entries(p.temas).filter(([, c]) => c > 0);
  if (topTopics.length) {
    const sorted = topTopics.sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (lang === 'es') lines.push(`Le interesa especialmente: ${sorted.map(([t]) => t).join(', ')}.`);
    else lines.push(`He is particularly interested in: ${sorted.map(([t]) => t).join(', ')}.`);
  }

  const maxMod = Object.values(p.modulos).reduce((a, b) => Math.max(a, b), 0);
  const topMods = Object.entries(p.modulos).filter(([, c]) => rel(c, maxMod) >= 0.4);
  if (topMods.length) {
    const sorted = topMods.sort((a, b) => p.modulos[b[0]] - p.modulos[a[0]]).map(([m]) => m);
    if (lang === 'es') lines.push(`Usa con frecuencia los módulos: ${sorted.join(', ')}.`);
    else lines.push(`He frequently uses the modules: ${sorted.join(', ')}.`);
  }

  if (style.palabrasFrecuentes.length) {
    if (lang === 'es') lines.push(`Suele usar palabras como: ${style.palabrasFrecuentes.join(', ')}.`);
    else lines.push(`He tends to use words like: ${style.palabrasFrecuentes.join(', ')}.`);
  }

  if (p.interactions > 0 && lang === 'es') {
    lines.push(`Hasta ahora ha interactuado ${p.interactions} veces contigo; adáptate a su estilo.`);
  } else if (p.interactions > 0) {
    lines.push(`So far he has interacted ${p.interactions} times with you; adapt to his style.`);
  }

  return lines.join(' ');
}

function rel(c: number, maxC: number): number {
  return maxC > 0 ? c / maxC : 0;
}

/** Perfil listo para el prompt (o texto por defecto si no hay información relevante). */
export function profilePromptText(userId: string, userName: string, lang: 'es' | 'en'): string {
  const p = getProfile(userId, userName);
  const txt = profileToPrompt(p, lang).trim();
  if (!txt) {
    return lang === 'es'
      ? 'Aún estoy conociendo al usuario; habla de forma natural y cercana.'
      : 'I am still getting to know the user; be natural and warm.';
  }
  return txt;
}
