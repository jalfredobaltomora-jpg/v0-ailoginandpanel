'use client';

function getFirstMonday(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 2 : firstDay === 1 ? 1 : 9 - firstDay;
}

function isReminderDay(): boolean {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const dow = now.getDay();

  // Sunday before 1st Monday
  const firstMon = getFirstMonday(year, month);
  const reminderDay = firstMon - 1;

  return dow === 0 && day === reminderDay;
}

export function checkInventoryReminder(): string | null {
  if (!isReminderDay()) return null;
  const now = new Date();
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `📋 Recordatorio: Mañana (${months[now.getMonth()]}) comienza el inventario mensual de equipos. Toma fotos y registra el estado de Tablets y Scanners.`;
}

export function scheduleReminderCheck() {
  if (typeof window === 'undefined') return;
  const msg = checkInventoryReminder();
  if (msg && Notification.permission === 'granted') {
    new Notification('Inventario de Equipos', { body: msg, icon: '/icon-192x192.png' });
  }
}
