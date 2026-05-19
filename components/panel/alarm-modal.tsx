'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Coffee, LogOut, Clock, Check, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dismissAlarm, setAlarmExtraHours, sendSystemNotification } from '@/lib/alarm-engine';
import type { Alarm } from '@/lib/alarm-engine';
import type { Empleado } from '@/lib/firebase';

interface AlarmModalProps {
  alarm: Alarm;
  empleado?: Empleado | null;
  onDismiss: () => void;
}

export function AlarmModal({ alarm, empleado, onDismiss }: AlarmModalProps) {
  const [showExtra, setShowExtra] = useState(false);
  const [extraTime, setExtraTime] = useState('');
  const [extraSet, setExtraSet] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sonido de alarma usando Web Audio API
  useEffect(() => {
    let playing = true;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = () => {
      if (!playing) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => { if (playing) playBeep(); }, 800);
    };
    playBeep();
    return () => { playing = false; ctx.close(); };
  }, []);

  // Notificación del sistema (con sonido y persistente)
  useEffect(() => {
    sendSystemNotification(alarm.title, alarm.message);
  }, [alarm]);

  const handleAccept = () => {
    dismissAlarm(alarm.id);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    onDismiss();
  };

  const handleExtraHours = () => {
    setShowExtra(true);
  };

  const handleExtraConfirm = () => {
    if (!extraTime) return;
    const [h, m] = extraTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const totalMin = h * 60 + m;

    setAlarmExtraHours(alarm.id, extraTime);

    // Reprogramar alarma de salida a la nueva hora
    const today = new Date();
    const exitDate = new Date(today);
    exitDate.setHours(h, m - 10, 0, 0); // alarma 10min antes

    setExtraSet(true);
    setShowExtra(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md animate-bounce rounded-2xl border-2 border-amber-500/60 bg-card p-6 shadow-[0_0_60px_rgba(255,200,0,0.2)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
            {alarm.type === 'lunch' ? (
              <Coffee className="h-7 w-7 text-amber-500" />
            ) : (
              <LogOut className="h-7 w-7 text-amber-500" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-500">{alarm.title}</h3>
            <p className="text-sm text-muted-foreground">{alarm.message}</p>
          </div>
        </div>

        {extraSet ? (
          <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-500">
            <Clock className="mr-2 inline h-4 w-4" />
            Alarma de salida reprogramada para las {extraTime} (recordatorio 10 min antes)
          </div>
        ) : showExtra ? (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-muted-foreground">¿Hasta qué hora sales hoy?</p>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={extraTime}
                onChange={(e) => setExtraTime(e.target.value)}
                className="border-amber-500/50 bg-input text-center text-lg font-mono"
              />
              <Button size="sm" className="bg-green-600 text-white" onClick={handleExtraConfirm}>
                <Check className="mr-1 h-4 w-4" />
                OK
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
              onClick={handleExtraHours}
            >
              <Timer className="mr-2 h-4 w-4" />
              Horas Extras
            </Button>
            <Button
              className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleAccept}
            >
              <Check className="mr-2 h-4 w-4" />
              Aceptar
            </Button>
          </div>
        )}

        {!showExtra && !extraSet && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            La alarma se reprogramará automáticamente para mañana
          </p>
        )}
      </div>
    </div>
  );
}
