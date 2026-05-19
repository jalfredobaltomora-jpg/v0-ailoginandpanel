'use client';

// ==============================
// ALARM ENGINE — SCA - JB
// ==============================

export interface Alarm {
  id: string;
  type: 'lunch' | 'exit';
  title: string;
  message: string;
  scheduledAt: number;   // timestamp ms
  dismissed: boolean;
  extraHours?: string;   // "17:30" si aplica horas extras
  date: string;          // YYYY-MM-DD
}

// --- Preferencias del usuario ---
const LUNCH_KEY = 'sca_lunch_time';
const LUNCH_WEEK_KEY = 'sca_lunch_week';
const SAT_WEEK_KEY = 'sca_sat_week';
const SAT_EXIT_KEY = 'sca_sat_exit_time';
const SAT_EAT_KEY = 'sca_sat_eat_company';
const SAT_LUNCH_KEY = 'sca_sat_lunch_time';
const ALARMS_KEY = 'sca_alarms';

// --- Utilidades de tiempo ---
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function getDayEndTime(date: Date = new Date()): string {
  const day = date.getDay();
  if (day === 1 || day === 5) return '17:00';
  if (day >= 2 && day <= 4) return '18:00';
  return '00:00';
}

export function getDayEndAdjusted(empleado?: { sexo?: string; embarazada?: boolean; semanasEmbarazo?: number }): { base: string; label: string; offsetMin: number } {
  const base = getDayEndTime();
  if (base === '00:00') return { base, label: 'Fin de semana', offsetMin: 0 };
  let offsetMin = 10;
  let label = `Salida ${base}`;
  if (empleado?.sexo === 'femenino' && empleado?.embarazada) {
    offsetMin = 20;
    label = `Salida ${base} (-10min embarazo)`;
  }
  return { base, label, offsetMin };
}

export function getLunchAlarmTime(lunchTime: string): string {
  const [h, m] = lunchTime.split(':').map(Number);
  const total = h * 60 + m - 10;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// --- localStorage ---
export function getStoredLunchTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LUNCH_KEY);
}

export function setStoredLunchTime(time: string) {
  localStorage.setItem(LUNCH_KEY, time);
}

export function getLunchPromptWeek(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(LUNCH_WEEK_KEY) || '0', 10);
}

export function setLunchPromptWeek(week: number) {
  localStorage.setItem(LUNCH_WEEK_KEY, String(week));
}

export function shouldAskLunch(): boolean {
  return getLunchPromptWeek() !== getWeekNumber();
}

// --- Sábado ---
export function getSatPromptWeek(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(SAT_WEEK_KEY) || '0', 10);
}

export function setSatPromptWeek(week: number) {
  localStorage.setItem(SAT_WEEK_KEY, String(week));
}

export function shouldAskSaturday(): boolean {
  return getSatPromptWeek() !== getWeekNumber();
}

export function getStoredSatExitTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SAT_EXIT_KEY);
}

export function setStoredSatExitTime(time: string) {
  localStorage.setItem(SAT_EXIT_KEY, time);
}

export function getStoredSatEatCompany(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SAT_EAT_KEY) === 'true';
}

export function setStoredSatEatCompany(eat: boolean) {
  localStorage.setItem(SAT_EAT_KEY, eat ? 'true' : 'false');
}

export function getStoredSatLunchTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SAT_LUNCH_KEY);
}

export function setStoredSatLunchTime(time: string) {
  localStorage.setItem(SAT_LUNCH_KEY, time);
}

export function scheduleSaturdayAlarms(exitTime: string, lunchTime?: string): Alarm[] {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const now = Date.now();
  const existing = getStoredAlarms();
  const kept = existing.filter(a => a.date !== dateStr || a.dismissed);

  const alarms: Alarm[] = [];

  if (lunchTime) {
    const alarmLunch = getLunchAlarmTime(lunchTime);
    const d = new Date(today);
    const [lh, lm] = alarmLunch.split(':').map(Number);
    d.setHours(lh, lm, 0, 0);
    if (d.getTime() > now) {
      alarms.push({
        id: `lunch-${dateStr}`, type: 'lunch',
        title: '¡Hora del Almuerzo!',
        message: `Sábado: tienes 10 minutos para almorzar (${lunchTime}).`,
        scheduledAt: d.getTime(), dismissed: false, date: dateStr,
      });
    }
  }

  if (exitTime) {
    const baseMin = timeToMinutes(exitTime);
    const alarmMin = baseMin - 10;
    const d = new Date(today);
    d.setHours(Math.floor(alarmMin / 60), alarmMin % 60, 0, 0);
    if (d.getTime() > now) {
      alarms.push({
        id: `exit-${dateStr}`, type: 'exit',
        title: '¡Hora de Salida!',
        message: `Sábado: te quedan 10 minutos para salir (${exitTime}).`,
        scheduledAt: d.getTime(), dismissed: false, date: dateStr,
      });
    }
  }

  setStoredAlarms([...kept, ...alarms]);
  return alarms;
}

export function getStoredAlarms(): Alarm[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(ALARMS_KEY) || '[]');
  } catch { return []; }
}

export function setStoredAlarms(alarms: Alarm[]) {
  localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
}

export function dismissAlarm(id: string) {
  const alarms = getStoredAlarms();
  const idx = alarms.findIndex(a => a.id === id);
  if (idx !== -1) { alarms[idx].dismissed = true; setStoredAlarms(alarms); }
}

export function setAlarmExtraHours(id: string, extraHours: string) {
  const alarms = getStoredAlarms();
  const idx = alarms.findIndex(a => a.id === id);
  if (idx !== -1) {
    alarms[idx].extraHours = extraHours;
    alarms[idx].dismissed = true;
    setStoredAlarms(alarms);
  }
}

export function clearOldAlarms() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const alarms = getStoredAlarms().filter(a => {
    const d = new Date(a.date); d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  });
  setStoredAlarms(alarms);
}

// --- Programar alarmas para una fecha específica ---
function scheduleAlarmsForDate(
  date: Date,
  lunchTime: string,
  empleado?: { sexo?: string; embarazada?: boolean }
): Alarm[] {
  const dateStr = date.toISOString().slice(0, 10);
  const day = date.getDay();
  if (day === 0 || day === 6) return [];

  const now = Date.now();
  const existing = getStoredAlarms();
  const kept = existing.filter(a => a.date !== dateStr || a.dismissed);

  const alarms: Alarm[] = [];

  if (lunchTime) {
    const alarmLunch = getLunchAlarmTime(lunchTime);
    const d = new Date(date);
    const [lh, lm] = alarmLunch.split(':').map(Number);
    d.setHours(lh, lm, 0, 0);
    if (d.getTime() > now) {
      alarms.push({
        id: `lunch-${dateStr}`, type: 'lunch',
        title: '¡Hora del Almuerzo!',
        message: `Tienes 10 minutos para ir a almorzar (${lunchTime}).`,
        scheduledAt: d.getTime(), dismissed: false, date: dateStr,
      });
    }
  }

  const endTime = getDayEndTime(date);
  if (endTime !== '00:00') {
    const baseMin = timeToMinutes(endTime);
    const offset = (empleado?.sexo === 'femenino' && empleado?.embarazada) ? 20 : 10;
    const alarmMin = baseMin - offset;
    const d = new Date(date);
    d.setHours(Math.floor(alarmMin / 60), alarmMin % 60, 0, 0);
    if (d.getTime() > now) {
      alarms.push({
        id: `exit-${dateStr}`, type: 'exit',
        title: '¡Hora de Salida!',
        message: empleado?.sexo === 'femenino' && empleado?.embarazada
          ? `Te quedan 10 min para salir (${endTime}). Embarazada: retírate 10 min antes.`
          : `Te quedan 10 minutos para salir (${endTime}).`,
        scheduledAt: d.getTime(), dismissed: false, date: dateStr,
      });
    }
  }

  setStoredAlarms([...kept, ...alarms]);
  return alarms;
}

// --- Programar alarmas de hoy ---
export function scheduleTodayAlarms(lunchTime: string, empleado?: { sexo?: string; embarazada?: boolean }): Alarm[] {
  return scheduleAlarmsForDate(new Date(), lunchTime, empleado);
}

// --- Programar alarmas de mañana ---
export function scheduleTomorrowAlarms(lunchTime: string, empleado?: { sexo?: string; embarazada?: boolean }): Alarm[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return scheduleAlarmsForDate(tomorrow, lunchTime, empleado);
}

// --- Consultas ---
export function getPendingAlarms(): Alarm[] {
  const now = Date.now();
  return getStoredAlarms().filter(a => !a.dismissed && a.scheduledAt <= now);
}

export function getTodayActiveAlarms(): Alarm[] {
  const today = new Date().toISOString().slice(0, 10);
  return getStoredAlarms().filter(a => a.date === today && !a.dismissed);
}

export function getNextAlarm(): Alarm | null {
  const now = Date.now();
  const alarms = getStoredAlarms().filter(a => !a.dismissed && a.scheduledAt > now);
  if (alarms.length === 0) return null;
  return alarms.reduce((a, b) => a.scheduledAt < b.scheduledAt ? a : b);
}

export function getMsUntilNextAlarm(): number | null {
  const next = getNextAlarm();
  if (!next) return null;
  return Math.max(0, next.scheduledAt - Date.now());
}

// --- Notificacion del sistema ---
export function sendSystemNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body, icon: '/icon.png', tag: 'sca-alarm',
      requireInteraction: true,  // no se descarta sola
      vibrate: [200, 100, 200, 100, 400],
    });
    // Vibración adicional en dispositivos móviles
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    setTimeout(() => n.close(), 30000);
  } catch { /* fallback silencioso */ }
}

// --- IA Greeting ---
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getMotivationalPhrase(): string {
  const phrases = [
    '¡Cada día es una nueva oportunidad para dar lo mejor de ti!',
    'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
    'Hoy es un gran día para lograr tus metas.',
    'Tu actitud determina tu dirección. ¡Vamos con todo!',
    'Recuerda: las grandes cosas nunca vienen de las zonas de confort.',
    'El trabajo en equipo hace que los sueños se hagan realidad.',
    'La calidad no es un acto, es un hábito.',
    'Sonríe, ¡hoy será un excelente día!',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
