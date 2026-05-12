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
    await set(ref(db, `empleados/${codigo}`), empleado);
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
    const data = snapshot.val();
    callback(data ? Object.values(data) : []);
  });
  return unsubscribe;
}

export function listenToSupportRequest(requestId: string, callback: (request: SupportRequest | null) => void): () => void {
  const requestRef = ref(db, `support-requests/${requestId}`);
  const unsubscribe = onValue(requestRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsubscribe;
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

// Generar PIN aleatorio
export function generarPIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
