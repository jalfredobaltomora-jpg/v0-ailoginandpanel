import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, get, update, remove, onValue, push, child } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDoyKZUXIQzdvNrWcUcAGXWlvRXdFbt5cQ",
  authDomain: "system-control-administrative.firebaseapp.com",
  databaseURL: "https://system-control-administrative-default-rtdb.firebaseio.com",
  projectId: "system-control-administrative",
  storageBucket: "system-control-administrative.firebasestorage.app",
  messagingSenderId: "845151026845",
  appId: "1:845151026845:web:43dc0d68130ce5476d5e74",
  measurementId: "G-XCYGMJ17BB"
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const storage = getStorage(app);

export { db, storage, ref, set, get, update, remove, onValue, push, child, storageRef, uploadBytes, getDownloadURL };

// ============================================
// RETRY — Exponential backoff for Firebase operations
// ============================================

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 1500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ============================================
// FCM — Firebase Cloud Messaging
// ============================================
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

let messaging: ReturnType<typeof getMessaging> | null = null;

export async function initMessaging() {
  if (messaging) return messaging;
  const supported = await isSupported();
  if (!supported) return null;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

export async function getFCMToken(vapidKey: string): Promise<string | null> {
  const m = await initMessaging();
  if (!m) return null;
  try {
    // Ruta correcta del SW segun el despliegue
    const base = location.pathname.replace(/\/[^/]*$/, '');
    const swUrl = base + 'firebase-messaging-sw.js';
    const registration = await navigator.serviceWorker.register(swUrl);
    return await getToken(m, { vapidKey, serviceWorkerRegistration: registration });
  } catch {
    return null;
  }
}

export function onForegroundMessage(cb: (payload: any) => void) {
  initMessaging().then(m => {
    if (m) onMessage(m, cb);
  });
}

// Guardar token FCM en RTDB
export async function saveFCMToken(userCode: string, token: string) {
  await set(ref(db, `fcm-tokens/${userCode}`), {
    token,
    updatedAt: Date.now(),
  });
}

// Guardar alarma programada en RTDB para el Cloud Function
export async function saveAlarmSchedule(userCode: string, alarm: { type: string; scheduledAt: number; date: string }) {
  const dateStr = alarm.date;
  await set(ref(db, `alarms/${userCode}/${dateStr}/${alarm.type}`), {
    ...alarm,
    notified: false,
  });
}

// Eliminar alarma de RTDB (cuando se dismiss)
export async function removeAlarmSchedule(userCode: string, date: string, type: string) {
  await remove(ref(db, `alarms/${userCode}/${date}/${type}`));
}

// ============================================
// TIPOS
// ============================================

export interface Empleado {
  code: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNac: string;
  fechaIng: string;
  area: string;
  cargo: string;
  foto?: string;
  activo: boolean;
  nacionalidad: string;
  direccion: string;
  estadoCivil: string;
  hijos: number;
  sexo: string;
  embarazada: boolean;
  semanasEmbarazo: number;
  discapacidad: boolean;
  // Historial de renovaciones de contrato
  firstHireDate?: string;      // Fecha de primer ingreso (YYYY-MM-DD)
  firstEmployeeCode?: string;  // Primer codigo de empleado
  renewalCount?: number;       // Veces que ha renovado contrato
}

export interface UsuarioIT {
  codigo: string;        // Vinculo con empleado
  username: string;
  pin: string;
  rol: 'admin' | 'user' | 'it-manager';
  activo: boolean;
  preguntaSecreta?: {
    question: string;
    answer: string;
  };
  createdAt: string;
  lastLogin?: string;
}

export interface SupportRequest {
  id: string;
  userId: string;
  username: string;
  status: 'pending' | 'it-active' | 'ai-active' | 'resolved';
  createdAt: number;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'it' | 'ai';
  text: string;
  ts: number;
}

export interface MarcaAsistencia {
  entrada: number;
  salida?: number;
  tipo: 'normal' | 'permiso';
  permisoId?: string;
}

export interface Permiso {
  id: string;
  empleadoCode: string;
  fecha: string;
  tipo: 'medico' | 'personal';
  motivo: string;
  estado: 'aprobado' | 'pendiente' | 'rechazado';
}

// ============================================
// FUNCIONES DE FIREBASE
// ============================================

// Empleados
export async function getEmpleados(): Promise<Empleado[]> {
  const snapshot = await get(ref(db, 'empleados'));
  return snapshot.val() ? Object.values(snapshot.val()) : [];
}

export async function getEmpleadoByCodigo(codigo: string): Promise<Empleado | null> {
  const snapshot = await get(ref(db, `empleados/${codigo}`));
  return snapshot.val() || null;
}

export async function saveEmpleado(codigo: string, empleado: Empleado): Promise<boolean> {
  try {
    await withRetry(() => set(ref(db, `empleados/${codigo}`), empleado));
    return true;
  } catch (e) {
    console.error('Firebase saveEmpleado error:', e, 'codigo:', codigo);
    return false;
  }
}

export async function updateEmpleado(codigo: string, updates: Partial<Empleado>): Promise<boolean> {
  try {
    // Strip undefined/null values so they don't overwrite existing data
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    // Use set() instead of update() — more resilient with WebSocket drops
    await withRetry(async () => {
      // Read current data then merge + set
      const snap = await get(ref(db, `empleados/${codigo}`));
      const current = snap.val() || {};
      await set(ref(db, `empleados/${codigo}`), { ...current, ...clean });
    });
    return true;
  } catch (e) {
    console.error('Firebase updateEmpleado error:', e, 'codigo:', codigo);
    return false;
  }
}

export async function getEmpleadosActivos(): Promise<Empleado[]> {
  const empleados = await getEmpleados();
  return empleados.filter(e => e.activo !== false);
}

export async function getEmpleadosInactivos(): Promise<Empleado[]> {
  const empleados = await getEmpleados();
  return empleados.filter(e => e.activo === false);
}

export async function deleteEmpleado(codigo: string): Promise<boolean> {
  try {
    await remove(ref(db, `empleados/${codigo}`));
    return true;
  } catch {
    return false;
  }
}

// Usuarios IT
export async function getUsuariosIT(): Promise<UsuarioIT[]> {
  const snapshot = await get(ref(db, 'usuarios-it'));
  return snapshot.val() ? Object.values(snapshot.val()) : [];
}

export function listenToUsuariosIT(callback: (usuarios: UsuarioIT[]) => void): () => void {
  const r = ref(db, 'usuarios-it');
  const unsub = onValue(r, (snap) => {
    const raw = snap.val();
    callback(raw ? Object.values(raw) : []);
  });
  return unsub;
}

export async function getUsuarioByUsername(username: string): Promise<UsuarioIT | null> {
  const usuarios = await getUsuariosIT();
  return usuarios.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function saveUsuarioIT(codigo: string, usuario: UsuarioIT): Promise<boolean> {
  try {
    await set(ref(db, `usuarios-it/${codigo}`), usuario);
    return true;
  } catch {
    return false;
  }
}

export async function deleteUsuarioIT(codigo: string): Promise<boolean> {
  try {
    await remove(ref(db, `usuarios-it/${codigo}`));
    return true;
  } catch {
    return false;
  }
}

// Support Requests
export async function getSupportRequests(): Promise<SupportRequest[]> {
  const snapshot = await get(ref(db, 'support-requests'));
  return snapshot.val() ? Object.values(snapshot.val()) : [];
}

export async function createSupportRequest(request: Omit<SupportRequest, 'id'>): Promise<string> {
  const newRef = push(ref(db, 'support-requests'));
  const id = newRef.key!;
  await set(newRef, { ...request, id });
  return id;
}

export async function updateSupportRequest(id: string, updates: Partial<SupportRequest>): Promise<boolean> {
  try {
    await update(ref(db, `support-requests/${id}`), updates);
    return true;
  } catch {
    return false;
  }
}

export async function addMessageToRequest(requestId: string, message: Omit<ChatMessage, 'id'>): Promise<boolean> {
  try {
    const newRef = push(ref(db, `support-requests/${requestId}/messages`));
    await set(newRef, { ...message, id: newRef.key });
    return true;
  } catch {
    return false;
  }
}

// Real-time listeners
export function listenToSupportRequests(callback: (requests: SupportRequest[]) => void): () => void {
  const requestsRef = ref(db, 'support-requests');
  const unsubscribe = onValue(requestsRef, (snapshot) => {
    const raw = snapshot.val();
    if (!raw) { callback([]); return; }
    const requests: SupportRequest[] = Object.values(raw);
    requests.forEach(r => {
      if (r.messages && !Array.isArray(r.messages)) {
        r.messages = Object.values(r.messages);
      }
    });
    callback(requests);
  });
  return unsubscribe;
}

export function listenToSupportRequest(requestId: string, callback: (request: SupportRequest | null) => void): () => void {
  const requestRef = ref(db, `support-requests/${requestId}`);
  const unsubscribe = onValue(requestRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.messages && !Array.isArray(data.messages)) {
        data.messages = Object.values(data.messages);
      }
    }
    callback(data);
  });
  return unsubscribe;
}

// ============================================
// ASISTENCIA (Reloj E/S)
// ============================================

export async function getMarcaAsistencia(date: string, empleadoCode: string): Promise<MarcaAsistencia | null> {
  const snapshot = await get(ref(db, `asistencia/${date}/${empleadoCode}`));
  return snapshot.val() || null;
}

export async function getMarcasDelDia(date: string): Promise<Record<string, MarcaAsistencia>> {
  const snapshot = await get(ref(db, `asistencia/${date}`));
  return snapshot.val() || {};
}

export async function registrarEntrada(date: string, empleadoCode: string, tipo: 'normal' | 'permiso' = 'normal', permisoId?: string): Promise<boolean> {
  try {
    const marcaRef = ref(db, `asistencia/${date}/${empleadoCode}`);
    await set(marcaRef, { entrada: Date.now(), tipo, ...(permisoId && { permisoId }) });
    return true;
  } catch {
    return false;
  }
}

export async function registrarSalida(date: string, empleadoCode: string): Promise<boolean> {
  try {
    const marcaRef = ref(db, `asistencia/${date}/${empleadoCode}`);
    const existing = await get(marcaRef);
    const data = existing.val() || {};
    await update(marcaRef, { ...data, salida: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function saveMarcaAsistencia(date: string, empleadoCode: string, marca: MarcaAsistencia): Promise<boolean> {
  try {
    await set(ref(db, `asistencia/${date}/${empleadoCode}`), marca);
    return true;
  } catch {
    return false;
  }
}

export async function deleteMarcaAsistencia(date: string, empleadoCode: string): Promise<boolean> {
  try {
    await remove(ref(db, `asistencia/${date}/${empleadoCode}`));
    return true;
  } catch {
    return false;
  }
}

export function listenToAsistencia(date: string, callback: (data: Record<string, MarcaAsistencia>) => void): () => void {
  const ref_ = ref(db, `asistencia/${date}`);
  const unsubscribe = onValue(ref_, (snapshot) => {
    callback(snapshot.val() || {});
  });
  return unsubscribe;
}

// ============================================
// PERMISOS
// ============================================

export async function getPermisosEmpleado(empleadoCode: string): Promise<Permiso[]> {
  const snapshot = await get(ref(db, 'permisos'));
  const all: Record<string, Permiso> = snapshot.val() || {};
  return Object.values(all).filter(p => p.empleadoCode === empleadoCode && p.estado === 'aprobado');
}

export async function getPermisoDelDia(empleadoCode: string, date: string): Promise<Permiso | null> {
  const snapshot = await get(ref(db, 'permisos'));
  const all: Record<string, Permiso> = snapshot.val() || {};
  const found = Object.values(all).find(p => p.empleadoCode === empleadoCode && p.fecha === date && p.estado === 'aprobado');
  return found || null;
}

export async function getAllPermisos(): Promise<Permiso[]> {
  const snapshot = await get(ref(db, 'permisos'));
  const all: Record<string, Permiso> = snapshot.val() || {};
  return Object.values(all).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function listenToPermisos(callback: (permisos: Permiso[]) => void): () => void {
  const r = ref(db, 'permisos');
  const unsub = onValue(r, (snap) => {
    const raw: Record<string, Permiso> = snap.val() || {};
    callback(Object.values(raw).sort((a, b) => b.fecha.localeCompare(a.fecha)));
  });
  return unsub;
}

export async function createPermiso(permiso: Omit<Permiso, 'id'>): Promise<string> {
  const newRef = push(ref(db, 'permisos'));
  const id = newRef.key!;
  await set(newRef, { ...permiso, id });
  return id;
}

export async function updatePermiso(id: string, updates: Partial<Permiso>): Promise<boolean> {
  try {
    await update(ref(db, `permisos/${id}`), updates);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// USER SCHEDULE PREFERENCES (cross-device sync)
// ============================================

export interface UserSchedule {
  lunchTime?: string;
  lunchWeek?: number;
  satWeek?: number;
  satExitTime?: string;
  satEatCompany?: boolean;
  satLunchTime?: string;
}

// QA Issues real-time listener
export function listenToQAIssues<T>(callback: (issues: T[]) => void): () => void {
  const r = ref(db, 'qa-issues');
  const unsub = onValue(r, (snap) => {
    const raw: Record<string, T> = snap.val() || {};
    callback(Object.values(raw));
  });
  return unsub;
}

export async function getUserSchedule(userCode: string): Promise<UserSchedule | null> {
  try {
    const snapshot = await get(ref(db, `preferences/${userCode}/schedule`));
    return snapshot.val() || null;
  } catch {
    return null;
  }
}

export async function saveUserSchedule(userCode: string, schedule: UserSchedule): Promise<boolean> {
  try {
    await withRetry(() => set(ref(db, `preferences/${userCode}/schedule`), schedule));
    return true;
  } catch {
    return false;
  }
}

export function listenToUserSchedule(userCode: string, callback: (schedule: UserSchedule | null) => void): () => void {
  const r = ref(db, `preferences/${userCode}/schedule`);
  const unsub = onValue(r, (snap) => callback(snap.val() || null));
  return unsub;
}

// ============================================
// IDE — File read/write helper (dev only, via API)
// ============================================

// Read a project file from the server filesystem
export async function ideReadFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/ide/read-file?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.content || null;
  } catch {
    return null;
  }
}

// Write content to a project file
export async function ideWriteFile(path: string, content: string): Promise<boolean> {
  try {
    const res = await fetch('/api/ide/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// AI assist for IDE
export async function ideAIAssist(prompt: string, currentCode: string, selectedFile: string): Promise<{ message: string; code?: string } | null> {
  try {
    const res = await fetch('/api/ide/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, currentCode, selectedFile }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Generar username automatico
export function generarUsername(empleado: Empleado): string {
  const primerNombre = empleado.nombres.split(' ')[0];
  const primerApellido = empleado.apellidos.split(' ')[0];
  const inicial = primerNombre.charAt(0).toLowerCase();
  const apellido = primerApellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const area = empleado.area.toLowerCase().replace(/\s+/g, '');
  return `${inicial}${apellido}_${area}`;
}

// Generar PIN desde codigo de trabajador
export function generarPIN(codigo?: string): string {
  return codigo || Math.floor(100000 + Math.random() * 900000).toString();
}
