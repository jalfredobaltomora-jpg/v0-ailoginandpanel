const firebaseConfig = {
  apiKey: "AIzaSyDoyKZUXIQzdvNrWcUcAGXWlvRXdFbt5cQ",
  authDomain: "system-control-administrative.firebaseapp.com",
  databaseURL: "https://system-control-administrative-default-rtdb.firebaseio.com",
  projectId: "system-control-administrative",
  storageBucket: "system-control-administrative.firebasestorage.app",
  messagingSenderId: "845151026845",
  appId: "1:845151026845:web:43dc0d68130ce5476d6e74",
  measurementId: "G-XCYGMJ17BB"
};

let _app: any = null;
let _db: any = null;
let _storage: any = null;
let _dbMod: any = null;
let _storageMod: any = null;
let _msgMod: any = null;
let _ready = false;
let _initPromise: Promise<void> | null = null;

async function _init(): Promise<void> {
  if (_ready) return;
  if (typeof window === 'undefined') return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      _dbMod = await import('firebase/database');
      _db = _dbMod.getDatabase(_app);
      _storageMod = await import('firebase/storage');
      _storage = _storageMod.getStorage(_app);
      _msgMod = await import('firebase/messaging');
      _ready = true;
      _readyResolve();
    } catch (e) {
      console.error('Firebase init failed:', e);
    }
  })();
  return _initPromise;
}

// Eagerly start loading on client
if (typeof window !== 'undefined') _init();

// Resolves once Firebase is fully initialized
let _readyResolve: () => void = () => {};
export const firebaseReady: Promise<void> = new Promise(r => { _readyResolve = r; });

export const db = new Proxy({} as any, { get(_t, prop) { return _db ? _db[prop] : undefined; } });
export const storage = new Proxy({} as any, { get(_t, prop) { return _storage ? _storage[prop] : undefined; } });

function _makeRef(database: any, path?: string) {
  return path === undefined ? _dbMod.ref(database) : _dbMod.ref(database, path);
}

export function ref(database: any, path?: string): any {
  if (_dbMod) return _makeRef(database, path);
  // Return proxy that delegates to real ref once _dbMod is set
  return new Proxy({} as any, {
    get(_, prop) {
      if (_dbMod) {
        const real = _makeRef(database, path);
        const val = (real as any)[prop];
        return typeof val === 'function' ? val.bind(real) : val;
      }
      return undefined;
    }
  });
}

export async function set(ref: any, value: any): Promise<void> {
  await _init(); return _dbMod.set(ref, value);
}

export async function get(ref: any) {
  await _init(); return _dbMod.get(ref);
}

export function onValue(ref: any, callback: (snap: any) => void, errorCallback?: (err: any) => void) {
  if (_dbMod) return _dbMod.onValue(ref, callback, errorCallback);
  // Defer until Firebase is ready
  firebaseReady.then(() => { if (_dbMod) _dbMod.onValue(ref, callback, errorCallback); });
  return () => {};
}

export function push(ref: any, value?: any) {
  if (!_dbMod) return { key: null };
  return _dbMod.push(ref, value);
}

export async function remove(ref: any): Promise<void> {
  await _init(); return _dbMod.remove(ref);
}

export async function update(ref: any, values: any): Promise<void> {
  await _init(); return _dbMod.update(ref, values);
}

export function child(parent: any, path: string) {
  if (!_dbMod) return null;
  return _dbMod.child(parent, path);
}

export function storageRef(storageOrPath: any, path?: string): any {
  if (!_ready) return null;
  return path === undefined ? _storageMod.ref(storageOrPath) : _storageMod.ref(storageOrPath, path);
}

export async function uploadBytes(ref: any, data: any, metadata?: any) {
  await _init(); return _storageMod.uploadBytes(ref, data, metadata);
}

export async function getDownloadURL(ref: any) {
  await _init(); return _storageMod.getDownloadURL(ref);
}

// ─── FCM — Firebase Cloud Messaging ──────────────────────────────

let _messaging: any = null;

export async function initMessaging() {
  if (_messaging) return _messaging;
  await _init(); if (!_msgMod) return null;
  const supported = await _msgMod.isSupported();
  if (!supported) return null;
  try {
    _messaging = _msgMod.getMessaging(_app);
    return _messaging;
  } catch {
    return null;
  }
}

export async function getFCMToken(vapidKey: string): Promise<string | null> {
  const m = await initMessaging();
  if (!m) return null;
  try {
    const base = location.pathname.replace(/\/[^/]*$/, '');
    const swUrl = base + 'firebase-messaging-sw.js';
    const registration = await navigator.serviceWorker.register(swUrl);
    return await _msgMod.getToken(m, { vapidKey, serviceWorkerRegistration: registration });
  } catch {
    return null;
  }
}

export function onForegroundMessage(cb: (payload: any) => void) {
  initMessaging().then(m => {
    if (m) _msgMod.onMessage(m, cb);
  });
}


// ─── Firebase helper functions ───────────────────────────────────

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

// Guardar token FCM en RTDB
export async function saveFCMToken(userCode: string, token: string) {
  await set(ref(db, `fcm-tokens/${userCode}`), { token, updatedAt: Date.now() });
}

// Guardar alarma programada en RTDB para el Cloud Function
export async function saveAlarmSchedule(userCode: string, alarm: { type: string; scheduledAt: number; date: string }) {
  await set(ref(db, `alarms/${userCode}/${alarm.date}/${alarm.type}`), { ...alarm, notified: false });
}

// Eliminar alarma de RTDB
export async function removeAlarmSchedule(userCode: string, date: string, type: string) {
  await remove(ref(db, `alarms/${userCode}/${date}/${type}`));
}

// ─── TIPOS ───────────────────────────────────────────────────────

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
  firstHireDate?: string;
  firstEmployeeCode?: string;
  renewalCount?: number;
}

export interface UsuarioIT {
  codigo: string;
  username: string;
  pin: string;
  rol: 'admin' | 'user' | 'it-manager';
  activo: boolean;
  permisos?: Record<string, boolean>;
  preguntaSecreta?: { question: string; answer: string; };
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

// ─── FUNCIONES DE FIREBASE ───────────────────────────────────────

export async function getEmpleados(): Promise<Empleado[]> {
  await _init();
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
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    await withRetry(async () => {
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
  } catch { return false; }
}

export async function getUsuariosIT(): Promise<UsuarioIT[]> {
  try {
    await _init();
    const snapshot = await get(ref(db, 'usuarios-it'));
    return snapshot.val() ? Object.values(snapshot.val()) : [];
  } catch (e) {
    console.error('Firebase getUsuariosIT error:', e);
    return [];
  }
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
    await _init();
    await set(ref(db, `usuarios-it/${codigo}`), usuario);
    return true;
  } catch (e) {
    console.error('Firebase saveUsuarioIT error:', e, 'codigo:', codigo);
    return false;
  }
}

export async function deleteUsuarioIT(codigo: string): Promise<boolean> {
  try {
    await _init();
    await remove(ref(db, `usuarios-it/${codigo}`));
    return true;
  } catch (e) {
    console.error('Firebase deleteUsuarioIT error:', e, 'codigo:', codigo);
    return false;
  }
}

export async function getSupportRequests(): Promise<SupportRequest[]> {
  await _init();
  const snapshot = await get(ref(db, 'support-requests'));
  return snapshot.val() ? Object.values(snapshot.val()) : [];
}

export async function createSupportRequest(request: Omit<SupportRequest, 'id'>): Promise<string> {
  await _init();
  const newRef = push(ref(db, 'support-requests'));
  const id = newRef.key!;
  await set(newRef, { ...request, id });
  return id;
}

export async function updateSupportRequest(id: string, updates: Partial<SupportRequest>): Promise<boolean> {
  try {
    await _init();
    await update(ref(db, `support-requests/${id}`), updates);
    return true;
  } catch { return false; }
}

export async function addMessageToRequest(requestId: string, message: Omit<ChatMessage, 'id'>): Promise<boolean> {
  try {
    await _init();
    const newRef = push(ref(db, `support-requests/${requestId}/messages`));
    await set(newRef, { ...message, id: newRef.key });
    return true;
  } catch { return false; }
}

export function listenToSupportRequests(callback: (requests: SupportRequest[]) => void): () => void {
  const requestsRef = ref(db, 'support-requests');
  const unsubscribe = onValue(requestsRef, (snapshot) => {
    const raw = snapshot.val();
    if (!raw) { callback([]); return; }
    const requests: SupportRequest[] = Object.values(raw);
    requests.forEach(r => {
      if (r.messages && !Array.isArray(r.messages)) r.messages = Object.values(r.messages);
    });
    callback(requests);
  });
  return unsubscribe;
}

export function listenToSupportRequest(requestId: string, callback: (request: SupportRequest | null) => void): () => void {
  const requestRef = ref(db, `support-requests/${requestId}`);
  const unsubscribe = onValue(requestRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.messages && !Array.isArray(data.messages)) data.messages = Object.values(data.messages);
    callback(data);
  });
  return unsubscribe;
}

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
    await set(ref(db, `asistencia/${date}/${empleadoCode}`), { entrada: Date.now(), tipo, ...(permisoId && { permisoId }) });
    return true;
  } catch { return false; }
}

export async function registrarSalida(date: string, empleadoCode: string): Promise<boolean> {
  try {
    const marcaRef = ref(db, `asistencia/${date}/${empleadoCode}`);
    const existing = await get(marcaRef);
    const data = existing.val() || {};
    await update(marcaRef, { ...data, salida: Date.now() });
    return true;
  } catch { return false; }
}

export async function saveMarcaAsistencia(date: string, empleadoCode: string, marca: MarcaAsistencia): Promise<boolean> {
  try {
    await set(ref(db, `asistencia/${date}/${empleadoCode}`), marca);
    return true;
  } catch { return false; }
}

export async function deleteMarcaAsistencia(date: string, empleadoCode: string): Promise<boolean> {
  try {
    await remove(ref(db, `asistencia/${date}/${empleadoCode}`));
    return true;
  } catch { return false; }
}

export function listenToAsistencia(date: string, callback: (data: Record<string, MarcaAsistencia>) => void): () => void {
  const ref_ = ref(db, `asistencia/${date}`);
  const unsubscribe = onValue(ref_, (snapshot) => callback(snapshot.val() || {}));
  return unsubscribe;
}

export async function getPermisosEmpleado(empleadoCode: string): Promise<Permiso[]> {
  const snapshot = await get(ref(db, 'permisos'));
  const all: Record<string, Permiso> = snapshot.val() || {};
  return Object.values(all).filter(p => p.empleadoCode === empleadoCode && p.estado === 'aprobado');
}

export async function getPermisoDelDia(empleadoCode: string, date: string): Promise<Permiso | null> {
  const snapshot = await get(ref(db, 'permisos'));
  const all: Record<string, Permiso> = snapshot.val() || {};
  return Object.values(all).find(p => p.empleadoCode === empleadoCode && p.fecha === date && p.estado === 'aprobado') || null;
}

export async function getAllPermisos(): Promise<Permiso[]> {
  const snapshot = await get(ref(db, 'permisos'));
  const all: Record<string, Permiso> = snapshot.val() || {};
  return Object.values(all).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function listenToPermisos(callback: (permisos: Permiso[]) => void): () => void {
  const r = ref(db, 'permisos');
  return onValue(r, (snap) => {
    const raw: Record<string, Permiso> = snap.val() || {};
    callback(Object.values(raw).sort((a, b) => b.fecha.localeCompare(a.fecha)));
  });
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
  } catch { return false; }
}

export interface UserSchedule {
  lunchTime?: string;
  lunchWeek?: number;
  satWeek?: number;
  satExitTime?: string;
  satEatCompany?: boolean;
  satLunchTime?: string;
}

export function listenToQAIssues<T>(callback: (issues: T[]) => void): () => void {
  const r = ref(db, 'qa-issues');
  return onValue(r, (snap) => {
    const raw: Record<string, T> = snap.val() || {};
    callback(Object.values(raw));
  });
}

export async function getUserSchedule(userCode: string): Promise<UserSchedule | null> {
  try {
    const snapshot = await get(ref(db, `preferences/${userCode}/schedule`));
    return snapshot.val() || null;
  } catch { return null; }
}

export async function saveUserSchedule(userCode: string, schedule: UserSchedule): Promise<boolean> {
  try {
    await withRetry(() => set(ref(db, `preferences/${userCode}/schedule`), schedule));
    return true;
  } catch { return false; }
}

export function listenToUserSchedule(userCode: string, callback: (schedule: UserSchedule | null) => void): () => void {
  const r = ref(db, `preferences/${userCode}/schedule`);
  return onValue(r, (snap) => callback(snap.val() || null));
}

// ─── Agenda / Notas Diarias ───────────────────────────────────────

export interface AgendaNote {
  id: string;
  text: string;
  date: string;       // "YYYY-MM-DD"
  year: number;
  month: number;
  week: number;
  day: number;
  done: boolean;
  priority: number;   // 1 (high), 2 (normal), 3 (low)
  createdAt: number;
  completedAt?: number;
}

export async function getAgendaNotes(userCode: string): Promise<AgendaNote[]> {
  try {
    await _init();
    const snapshot = await get(ref(db, `agenda/${userCode}/notes`));
    const raw: Record<string, AgendaNote> = snapshot.val() || {};
    return Object.values(raw).sort((a, b) => (b.priority || 2) - (a.priority || 2) || b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function saveAgendaNote(userCode: string, note: Omit<AgendaNote, 'id'>): Promise<string> {
  await _init();
  const newRef = push(ref(db, `agenda/${userCode}/notes`));
  const id = newRef.key!;
  await set(newRef, { ...note, id });
  return id;
}

export async function updateAgendaNote(userCode: string, noteId: string, updates: Partial<AgendaNote>): Promise<boolean> {
  try {
    await _init();
    await update(ref(db, `agenda/${userCode}/notes/${noteId}`), updates);
    return true;
  } catch { return false; }
}

export async function deleteAgendaNote(userCode: string, noteId: string): Promise<boolean> {
  try {
    await _init();
    await remove(ref(db, `agenda/${userCode}/notes/${noteId}`));
    return true;
  } catch { return false; }
}

export async function listenToAgendaNotes(userCode: string, callback: (notes: AgendaNote[]) => void): Promise<() => void> {
  await _init();
  const r = ref(db, `agenda/${userCode}/notes`);
  return onValue(r, (snap) => {
    const raw: Record<string, AgendaNote> = snap.val() || {};
    callback(Object.values(raw).sort((a, b) => (b.priority || 2) - (a.priority || 2) || b.createdAt - a.createdAt));
  });
}

// ─── IDE helpers (no Firebase) ────────────────────────────────────

export async function ideReadFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/ide/read-file?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.content || null;
  } catch { return null; }
}

export async function ideWriteFile(path: string, content: string): Promise<boolean> {
  try {
    const res = await fetch('/api/ide/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    return res.ok;
  } catch { return false; }
}

export async function ideAIAssist(prompt: string, currentCode: string, selectedFile: string): Promise<{ message: string; code?: string } | null> {
  try {
    const res = await fetch('/api/ide/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, currentCode, selectedFile }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export function generarUsername(empleado: Empleado): string {
  const primerNombre = empleado.nombres.split(' ')[0];
  const primerApellido = empleado.apellidos.split(' ')[0];
  const inicial = primerNombre.charAt(0).toLowerCase();
  const apellido = primerApellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const area = empleado.area.toLowerCase().replace(/\s+/g, '');
  return `${inicial}${apellido}_${area}`;
}

export function generarPIN(codigo?: string): string {
  return codigo || Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Search helpers for JAB edit flow ──────────────────────────────

export async function buscarEmpleados(query: string): Promise<Empleado[]> {
  await _init();
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const all = await getEmpleados();
  return all.filter(e =>
    (e.nombres + ' ' + e.apellidos).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    || e.code === query
    || e.cedula.includes(query)
  );
}

export async function buscarUsuariosIT(query: string): Promise<UsuarioIT[]> {
  await _init();
  const q = query.toLowerCase();
  const all = await getUsuariosIT();
  return all.filter(u => u.username.toLowerCase().includes(q) || u.codigo === query);
}

export async function buscarAgendaNotes(userCode: string, query: string): Promise<AgendaNote[]> {
  const q = query.toLowerCase();
  const all = await getAgendaNotes(userCode);
  return all.filter(n => n.text.toLowerCase().includes(q));
}

export async function updateUsuarioIT(codigo: string, updates: Partial<UsuarioIT>): Promise<boolean> {
  try {
    await _init();
    const r = ref(db, `usuarios-it/${codigo}`);
    const snap = await get(r);
    if (!snap.exists()) return false;
    const existing = snap.val() as UsuarioIT;
    await set(r, { ...existing, ...updates });
    return true;
  } catch { return false; }
}

export interface AccesoriosEquipo {
  usbCable: boolean;
  chargerCube: boolean;
  microSDTrayKey: boolean;
  cableOTG: boolean;
}

export interface HistorialMensual {
  mes: string;
  fotos: {
    lateralIzquierdo: string;
    lateralDerecho: string;
    frontal: string;
    trasero: string;
  };
  comentarios: string;
  scoreJAB: number;
  timestamp: number;
  firma?: string;
}

export interface EquipoInventario {
  id: string;
  tipo: 'tablet' | 'scanner';
  serialNumber: string;
  marca: string;
  modelo: string;
  estado: string;
  accesorios: AccesoriosEquipo;
  empleadoAsignado: string;
  fotos: {
    lateralIzquierdo: string;
    lateralDerecho: string;
    frontal: string;
    trasero: string;
  };
  fechaAsignacion: string;
  mesInventario: string;
  historial: HistorialMensual[];
  createdAt: number;
  updatedAt: number;
  firma?: string;
}

export async function getEquiposInventario(): Promise<EquipoInventario[]> {
  try {
    await _init();
    const snapshot = await get(ref(db, 'equipos-inventario'));
    const raw: Record<string, EquipoInventario> = snapshot.val() || {};
    return Object.values(raw);
  } catch (e) {
    console.error('Firebase getEquiposInventario error:', e);
    return [];
  }
}

export async function getEquipoInventario(id: string): Promise<EquipoInventario | null> {
  try {
    const snapshot = await get(ref(db, `equipos-inventario/${id}`));
    return snapshot.val() || null;
  } catch { return null; }
}

export async function saveEquipoInventario(equipo: Omit<EquipoInventario, 'id'>): Promise<string> {
  await _init();
  const newRef = push(ref(db, 'equipos-inventario'));
  const id = newRef.key!;
  await set(newRef, { ...equipo, id });
  return id;
}

export async function updateEquipoInventario(id: string, updates: Partial<EquipoInventario>): Promise<boolean> {
  try {
    await _init();
    await update(ref(db, `equipos-inventario/${id}`), updates);
    return true;
  } catch { return false; }
}

export async function deleteEquipoInventario(id: string): Promise<boolean> {
  try {
    await _init();
    await remove(ref(db, `equipos-inventario/${id}`));
    return true;
  } catch { return false; }
}

export function listenToEquiposInventario(callback: (equipos: EquipoInventario[]) => void): () => void {
  const r = ref(db, 'equipos-inventario');
  return onValue(r, (snap) => {
    const raw: Record<string, EquipoInventario> = snap.val() || {};
    callback(Object.values(raw));
  });
}

// ─── QA DHU Records ──────────────────────────────────────────────

export interface QADHURecord {
  id: string;
  item: string;
  inspectionDate: string;
  week: number;
  month: string;
  factory: string;
  line: string;
  po: string;
  color: string;
  buyer: string;
  auditor: string;
  style: string;
  visualSample: number;
  visualReject: number;
  visualApproved: number;
  dhuScorePercent: number;
  performanceDHU: string;
  passRateScorePercent: number;
  createdAt: number;
  createdBy: string;
}

export async function saveQADHURecord(record: Omit<QADHURecord, 'id'>): Promise<string> {
  await _init();
  const newRef = push(ref(db, 'qa-dhu-records'));
  const id = newRef.key!;
  await set(newRef, { ...record, id });
  return id;
}

export async function updateQADHURecord(id: string, data: Partial<QADHURecord>): Promise<boolean> {
  try {
    await _init();
    await update(ref(db, `qa-dhu-records/${id}`), data);
    return true;
  } catch {
    return false;
  }
}

export async function getQADHURecords(): Promise<QADHURecord[]> {
  try {
    await _init();
    const snapshot = await get(ref(db, 'qa-dhu-records'));
    const raw: Record<string, QADHURecord> = snapshot.val() || {};
    return Object.values(raw).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export function listenToQADHURecords(callback: (records: QADHURecord[]) => void): () => void {
  const r = ref(db, 'qa-dhu-records');
  return onValue(r, (snap) => {
    const raw: Record<string, QADHURecord> = snap.val() || {};
    callback(Object.values(raw).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  });
}

export interface QADHUCatalogItem {
  id: string;
  item: string;
  style: string;
  factory: string;
  line: string;
  po: string;
  color: string;
  buyer: string;
  createdAt: number;
  createdBy: string;
}

export async function saveQADHUCatalogItem(data: Omit<QADHUCatalogItem, 'id'>): Promise<string> {
  await _init();
  const newRef = push(ref(db, 'qa-dhu-catalog'));
  const id = newRef.key!;
  await set(newRef, { ...data, id });
  return id;
}

export async function getQADHUCatalogItems(): Promise<QADHUCatalogItem[]> {
  try {
    await _init();
    const snapshot = await get(ref(db, 'qa-dhu-catalog'));
    const raw: Record<string, QADHUCatalogItem> = snapshot.val() || {};
    return Object.values(raw).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export function listenToQADHUCatalog(callback: (items: QADHUCatalogItem[]) => void): () => void {
  const r = ref(db, 'qa-dhu-catalog');
  return onValue(r, (snap) => {
    const raw: Record<string, QADHUCatalogItem> = snap.val() || {};
    callback(Object.values(raw).sort((a, b) => a.item.localeCompare(b.item)));
  });
}

export async function deleteQADHUCatalogItem(id: string): Promise<boolean> {
  try {
    await _init();
    await remove(ref(db, `qa-dhu-catalog/${id}`));
    return true;
  } catch {
    return false;
  }
}
