'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlarmModal } from '@/components/panel/alarm-modal';
import {
  getPendingAlarms, getStoredLunchTime, scheduleTodayAlarms, scheduleTomorrowAlarms,
  getMsUntilNextAlarm, clearOldAlarms, dismissAlarm,
} from '@/lib/alarm-engine';
import { getStoredUser } from '@/lib/auth-store';
import { getEmpleadoByCodigo, getFCMToken, saveFCMToken, saveAlarmSchedule, removeAlarmSchedule, onForegroundMessage, type Empleado } from '@/lib/firebase';
import type { Alarm } from '@/lib/alarm-engine';

// VAPID Key — obtener desde Firebase Console > Cloud Messaging > Web Push Certificate
const VAPID_KEY = 'BFa8vG8J5fG6jJkLmNoPqRsTuVwXyZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01';

export function AlarmMonitor() {
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const userRef = useRef<string | null>(null);
  const activeAlarmRef = useRef(activeAlarm);
  activeAlarmRef.current = activeAlarm;

  // Cargar empleado y registrar FCM
  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    userRef.current = user.codigo;

    getEmpleadoByCodigo(user.codigo).then(setEmpleado);

    // Registrar FCM para push notifications
    getFCMToken(VAPID_KEY).then(token => {
      if (token) saveFCMToken(user.codigo, token);
    });

    // Escuchar mensajes en primer plano
    onForegroundMessage((payload) => {
      if (payload?.data?.type && !activeAlarmRef.current) {
        // Forzar revisión de alarmas locales
        const pending = getPendingAlarms();
        if (pending.length > 0) setActiveAlarm(pending[0]);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar alarmas en Firebase RTDB para el Cloud Function
  const syncAlarmsToFirebase = useCallback(() => {
    const userCode = userRef.current;
    if (!userCode) return;
    const alarms = getStoredAlarmsFunc();
    alarms.forEach((a: { type: string; scheduledAt: number; date: string; dismissed?: boolean }) => {
      if (!a.dismissed) {
        saveAlarmSchedule(userCode, { type: a.type, scheduledAt: a.scheduledAt, date: a.date });
      } else {
        removeAlarmSchedule(userCode, a.date, a.type);
      }
    });
  }, []);

  // Programar timer preciso
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!mountedRef.current) return;

    const pending = getPendingAlarms();
    if (pending.length > 0) {
      setActiveAlarm(pending[0]);
      try { window.dispatchEvent(new CustomEvent('jab-alarm', { detail: pending[0] })); } catch {}
      return;
    }

    const ms = getMsUntilNextAlarm();
    if (ms !== null && ms > 0) {
      timerRef.current = setTimeout(() => {
        const nowPending = getPendingAlarms();
        if (nowPending.length > 0 && mountedRef.current) {
          setActiveAlarm(nowPending[0]);
        }
      }, ms);
    }
  }, []);

  // Init
  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    clearOldAlarms();

    const lunch = getStoredLunchTime();
    const day = new Date().getDay();
    if (lunch && day >= 1 && day <= 5) {
      scheduleTodayAlarms(lunch, empleado || undefined);
    }

    syncAlarmsToFirebase();
    scheduleNext();

    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [empleado, scheduleNext, syncAlarmsToFirebase]);

  // Re-sync al recuperar visibilidad
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        // Auto-dismiss alarms that expired >5 min ago
        const now = Date.now();
        const stale = getPendingAlarms().filter(a => now - a.scheduledAt > 5 * 60 * 1000);
        stale.forEach(a => dismissAlarm(a.id));

        const pending = getPendingAlarms();
        if (pending.length > 0 && !activeAlarm) {
          setActiveAlarm(pending[0]);
          return;
        }
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [activeAlarm, scheduleNext]);

  const handleDismiss = useCallback(() => {
    setActiveAlarm(null);

    // Pre-schedule tomorrow's alarms
    const lunch = getStoredLunchTime();
    if (lunch) scheduleTomorrowAlarms(lunch, empleado || undefined);

    scheduleNext();
  }, [empleado, scheduleNext]);

  if (!activeAlarm) return null;

  return (
    <AlarmModal alarm={activeAlarm} empleado={empleado} onDismiss={handleDismiss} />
  );
}

// Helper local para no importar ciclo
function getStoredAlarmsFunc() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('sca_alarms') || '[]');
  } catch { return []; }
}
