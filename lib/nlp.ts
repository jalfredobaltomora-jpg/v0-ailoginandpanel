'use client';

/**
 * ─── NLP local ligero para JAB ───
 *
 * Capa de procesamiento de lenguaje natural que opera ANTES del LLM:
 *  - normaliza el texto (acentos, mayúsculas, contracciones, ruido de voz).
 *  - detecta y expande sinónimos/canónicos de dominio.
 *  - lematiza verbos frecuentes del español.
 *  - aplica fuzzy matching (similitud de Levenshtein) para intenciones.
 *
 * El LLM sigue siendo la fuente principal de respuestas fluidas; esta capa
 * mejora el enrutamiento, la precisión del fallback offline y enriquece el
 * prompt con la "intención canónica" detectada.
 */

export type Lang = 'es' | 'en';

// ─── Normalización de texto ───

/** Elimina acentos diacríticos conservando la ñ y la ü. */
export function stripAccents(s: string): string {
  return s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7EñÑ]/g, (c) => c);
}

/** Palabras de relleno que se eliminan al analizar el núcleo de la frase. */
const STOP_WORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al',
  'y', 'e', 'o', 'u', 'que', 'con', 'por', 'para', 'en', 'se', 'su', 'sus', 'mi',
  'tu', 'me', 'te', 'le', 'les', 'lo', 'los', 'las', 'es', 'son', 'estoy', 'esta',
  'estas', 'estamos', 'hay', 'tengo', 'quiero', 'necesito', 'puedes', 'puedo',
  'haz', 'hacer', 'hago', 'favor', 'porfavor', 'por favor', 'ya', 'asi', 'así',
  'como', 'cuando', 'donde', 'saber', 'sabes', 'the', 'a', 'an', 'and', 'of',
  'to', 'for', 'in', 'on', 'is', 'are', 'i', 'you', 'me', 'my', 'your', 'can',
  'please', 'want', 'need', 'do', 'does', 'have', 'has',
]);

/** Verbos irregulares frecuentes mapeados a su infinitivo (lematización parcial). */
const VERB_LEMMAS_ES: Record<string, string> = {
  voy: 'ir', fui: 'ir', iba: 'ir', va: 'ir', vamos: 'ir', iré: 'ir',
  quiero: 'querer', quieres: 'querer', quiso: 'querer', quiere: 'querer', quería: 'querer',
  llevame: 'llevar', llevarme: 'llevar', lleva: 'llevar', llevo: 'llevar',
  abre: 'abrir', abrirme: 'abrir', abro: 'abrir', abreme: 'abrir', abrio: 'abrir',
  busca: 'buscar', busco: 'buscar', busqué: 'buscar',
  navega: 'navegar', navego: 'navegar',
  reproduce: 'reproducir', reproduzco: 'reproducir', pon: 'poner', pongo: 'poner',
  escribe: 'escribir', escribo: 'escribir',
  muestra: 'mostrar', muestro: 'mostrar',
  actualiza: 'actualizar', refresca: 'refrescar',
  recarga: 'recargar',
  copia: 'copiar', copio: 'copiar',
  toma: 'tomar', apunta: 'apuntar',
  saca: 'sacar', dame: 'dar', damme: 'dar',
  dime: 'decir', di: 'decir',
  cierra: 'cerrar', cierrame: 'cerrar', salí: 'salir',
  sube: 'subir', baja: 'bajar', desplazate: 'desplazar',
  ayuda: 'ayudar', ayudame: 'ayudar', ayúdame: 'ayudar',
  envia: 'enviar', envio: 'enviar',
  crea: 'crear', creo: 'crear', genera: 'generar',
};

/** Alias de palabras del dominio → término canónico (para detectar intención). */
const SYNONYMS_ES: Record<string, string> = {
  // módulos
  recursos: 'rrhh', humanos: 'rrhh', personal: 'rrhh', empleados: 'rrhh', empleado: 'rrhh',
  calidad: 'qa', reportes: 'qa', reporte: 'qa', kpi: 'qa', dashboard: 'qa', graficas: 'qa',
  soporte: 'itmanager', tecnico: 'itmanager', usuarios: 'usuarios', cuentas: 'usuarios',
  agenda: 'agenda', notas: 'agenda', ide: 'ide', codigo: 'ide', programar: 'ide',
  // acciones
  menu: 'navegar', inicio: 'navegar', panel: 'navegar',
  buscar: 'buscar', busca: 'buscar', google: 'buscar',
  musica: 'musica', cancion: 'musica', youtube: 'musica',
  reloj: 'hora', tiempo: 'hora',
  captura: 'screenshot', pantallazo: 'screenshot',
  portapapeles: 'copiar',
  recordatorio: 'nota', apuntar: 'nota', guardame: 'nota',
  sesion: 'logout', salir: 'logout',
};

/** Expande contracciones frecuentes del español hablado. */
const CONTRACTIONS_ES: Record<string, string> = {
  pa: 'para', d: 'de', 'n': 'en', q: 'que', k: 'que', x: 'por', t: 'te',
  dime: 'dime', venme: 'venme',
};

/**
 * Normaliza un texto para análisis: minúsculas, sin acentos, contracciones
 * expandidas y palabras de relleno removidas (opcional).
 */
export function normalizeText(raw: string, lang: Lang = 'es'): string {
  let t = (raw || '').trim().toLowerCase();
  if (lang === 'es') {
    // expandir contracciones de una sola letra/palabra (no rompe n-grams)
    for (const [short, full] of Object.entries(CONTRACTIONS_ES)) {
      t = t.replace(new RegExp(`(^|\\s)${short}(?=\\s|$)`, 'g'), ` $1${full}`.trim());
    }
  }
  return stripAccents(t).replace(/\s+/g, ' ').trim();
}

/** Elimina palabras de relleno conservando las palabras clave. */
export function removeStopWords(normalized: string, lang: Lang = 'es'): string[] {
  return normalized
    .split(/\s+/)
    .filter(w => w && !STOP_WORDS_ES.has(w));
}

/** Lematiza verbos frecuentes en una lista de tokens. */
export function lemmatizeTokens(tokens: string[], lang: Lang = 'es'): string[] {
  if (lang !== 'es') return tokens;
  return tokens.map(t => VERB_LEMMAS_ES[t] || t);
}

/** Mapea tokens a sus sinónimos canónicos de dominio. */
export function synonymMap(tokens: string[], lang: Lang = 'es'): string[] {
  if (lang !== 'es') return tokens;
  return tokens.map(t => SYNONYMS_ES[t] || t);
}

/** Devuelve los tokens clave normalizados de una frase (stop words removidas + lematizadas + sinónimos). */
export function keyTokens(raw: string, lang: Lang = 'es'): string[] {
  const norm = normalizeText(raw, lang);
  const tokens = removeStopWords(norm, lang);
  return lemmatizeTokens(synonymMap(tokens, lang), lang);
}

// ─── Fuzzy matching (similitud de Levenshtein) ───

/** Distancia de Levenshtein entre dos cadenas (inserciones/eliminaciones/sustituciones). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Similitud normalizada 0..1 entre dos cadenas. */
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * Busca el término que más se parece a `query` dentro de `candidates`.
 * Devuelve { best, score } o null si ninguno supera el umbral.
 */
export function fuzzyMatch(
  query: string,
  candidates: string[],
  threshold = 0.55,
): { best: string; score: number } | null {
  const q = normalizeText(query);
  if (!q) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const cn = normalizeText(c);
    // coincidencia por subcadena (palabra contenida) es muy fiable
    let score = similarity(q, cn);
    if (cn.includes(q) || q.includes(cn)) score = Math.max(score, 0.9);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (best && bestScore >= threshold) return { best, score: bestScore };
  return null;
}

// ─── Detección de idioma básica ───

const ES_MARKERS = ['que', 'para', 'como', 'estoy', 'quiero', 'hora', 'por', 'con', 'los', 'las', 'una'];
const EN_MARKERS = ['the', 'what', 'how', 'please', 'for', 'with', 'and', 'you', 'time', 'open'];

/** Heurística de idioma (es vs en) basada en marcadores frecuentes. Se usa solo como apoyo. */
export function detectLang(raw: string): Lang {
  const tokens = stripAccents(raw.toLowerCase()).match(/[a-zñ]+/g) || [];
  let es = 0, en = 0;
  for (const tk of tokens) {
    if (ES_MARKERS.includes(tk)) es++;
    if (EN_MARKERS.includes(tk)) en++;
  }
  return en > es ? 'en' : 'es';
}
