'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Coffee, LogOut, Clock, Calendar, Baby, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getEmpleadoByCodigo, onValue, ref, db, saveUserSchedule, type Empleado, type UsuarioIT, type UserSchedule } from '@/lib/firebase';
import {
  getGreeting, getMotivationalPhrase, getDayEndTime, getDayEndAdjusted,
  getStoredLunchTime, setStoredLunchTime,
  shouldAskLunch, setLunchPromptWeek, getLunchPromptWeek, getWeekNumber, scheduleTodayAlarms,
  shouldAskSaturday, setSatPromptWeek, getSatPromptWeek,
  getStoredSatExitTime, setStoredSatExitTime,
  getStoredSatEatCompany, setStoredSatEatCompany,
  getStoredSatLunchTime, setStoredSatLunchTime,
  scheduleSaturdayAlarms,
  timeToMinutes, minutesToTime,
} from '@/lib/alarm-engine';

interface WelcomeScreenProps {
  user: UsuarioIT;
  onEnter: () => void;
}

export function WelcomeScreen({ user, onEnter }: WelcomeScreenProps) {
  const router = useRouter();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLunchPrompt, setNeedsLunchPrompt] = useState(false);
  const [lunchTime, setLunchTime] = useState('');
  const [lunchSaved, setLunchSaved] = useState(false);
  const [dayInfo, setDayInfo] = useState<{ base: string; label: string; offsetMin: number } | null>(null);

  // Saturday state
  const [needsSatPrompt, setNeedsSatPrompt] = useState(false);
  const [satExitTime, setSatExitTime] = useState('');
  const [satEatCompany, setSatEatCompany] = useState<boolean | null>(null);
  const [satLunchTime, setSatLunchTime] = useState('');
  const [satSaved, setSatSaved] = useState(false);

  const dismissedLunchRef = useRef(false);
  const dismissedSatRef = useRef(false);

  const greeting = getGreeting();
  const phrase = getMotivationalPhrase();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  const isSaturday = day === 6;

  useEffect(() => {
    const load = async () => {
      const emp = await getEmpleadoByCodigo(user.codigo);
      setEmpleado(emp);

      if (emp) {
        if (isSaturday) {
          setDayInfo(null);
        } else {
          setDayInfo(getDayEndAdjusted(emp));
        }
      } else {
        setDayInfo(isSaturday ? null : { base: getDayEndTime(), label: `Salida ${getDayEndTime()}`, offsetMin: 10 });
      }
    };
    load();

    // Real-time listener for schedule (cross-device sync)
    const scheduleRef = ref(db, `preferences/${user.codigo}/schedule`);
    const unsub = onValue(scheduleRef, (snap) => {
      const fbSchedule: UserSchedule | null = snap.val();

      if (fbSchedule) {
        if (fbSchedule.lunchTime) {
          setStoredLunchTime(fbSchedule.lunchTime);
          setLunchTime(fbSchedule.lunchTime);
        }
        if (fbSchedule.lunchWeek) setLunchPromptWeek(fbSchedule.lunchWeek);
        if (fbSchedule.satExitTime) {
          setStoredSatExitTime(fbSchedule.satExitTime);
          setSatExitTime(fbSchedule.satExitTime);
        }
        if (fbSchedule.satEatCompany !== undefined) {
          setStoredSatEatCompany(fbSchedule.satEatCompany);
          setSatEatCompany(fbSchedule.satEatCompany);
        }
        if (fbSchedule.satLunchTime) {
          setStoredSatLunchTime(fbSchedule.satLunchTime);
          setSatLunchTime(fbSchedule.satLunchTime);
        }
        if (fbSchedule.satWeek) setSatPromptWeek(fbSchedule.satWeek);
      }

      if (isSaturday) {
        if (!dismissedSatRef.current) {
          const fbHasSat = !!fbSchedule?.satExitTime;
          const fbSatWeek = fbSchedule?.satWeek;
          const currWeek = getWeekNumber();
          if (fbHasSat) {
            if (fbSatWeek != null && fbSatWeek !== currWeek) {
              setNeedsSatPrompt(true);
            }
          } else if (shouldAskSaturday()) {
            setNeedsSatPrompt(true);
          }
        }
      } else {
        if (!dismissedLunchRef.current && !isWeekend) {
          const fbHasLunch = !!fbSchedule?.lunchTime;
          const fbLunchWeek = fbSchedule?.lunchWeek;
          const currWeek = getWeekNumber();
          if (fbHasLunch) {
            if (fbLunchWeek != null && fbLunchWeek !== currWeek) {
              setNeedsLunchPrompt(true);
            }
          } else if (shouldAskLunch()) {
            setNeedsLunchPrompt(true);
          }
        }
      }

      setLoading(false);
    });

    return unsub;
  }, [user, isWeekend, isSaturday]);

  const handleLunchSave = async () => {
    if (!lunchTime) return;
    dismissedLunchRef.current = true;
    setStoredLunchTime(lunchTime);
    const week = getWeekNumber();
    setLunchPromptWeek(week);
    setNeedsLunchPrompt(false);
    setLunchSaved(true);
    scheduleTodayAlarms(lunchTime, empleado || undefined);
    // Save to Firebase (cross-device sync)
    await saveUserSchedule(user.codigo, {
      lunchTime, lunchWeek: week,
      satExitTime: getStoredSatExitTime() || undefined,
      satEatCompany: getStoredSatEatCompany() || undefined,
      satLunchTime: getStoredSatLunchTime() || undefined,
      satWeek: getSatPromptWeek() || undefined,
    } as UserSchedule);
  };

  const handleSatSave = async () => {
    if (!satExitTime) return;
    dismissedSatRef.current = true;
    setStoredSatExitTime(satExitTime);
    setStoredSatEatCompany(satEatCompany === true);
    if (satEatCompany && satLunchTime) {
      setStoredSatLunchTime(satLunchTime);
    }
    const week = getWeekNumber();
    setSatPromptWeek(week);
    setNeedsSatPrompt(false);
    setSatSaved(true);
    scheduleSaturdayAlarms(satExitTime, satEatCompany ? satLunchTime : undefined);
    // Save to Firebase (cross-device sync)
    await saveUserSchedule(user.codigo, {
      satWeek: week,
      satExitTime,
      satEatCompany: satEatCompany === true,
      satLunchTime: satEatCompany ? satLunchTime : undefined,
      lunchTime: getStoredLunchTime() || undefined,
      lunchWeek: getLunchPromptWeek() || undefined,
    } as UserSchedule);
  };

  const handleEnter = () => {
    if (isSaturday) {
      const exit = getStoredSatExitTime();
      if (exit) {
        scheduleSaturdayAlarms(exit, getStoredSatEatCompany() ? getStoredSatLunchTime() || undefined : undefined);
      }
    } else {
      const stored = getStoredLunchTime();
      if (stored && !isWeekend) {
        scheduleTodayAlarms(stored, empleado || undefined);
      }
    }
    onEnter();
  };

  const getEmployeeName = (): string => {
    if (!empleado) return user.username;
    const names = empleado.nombres.split(' ');
    const lastNames = empleado.apellidos.split(' ');
    return `${names.slice(0, 2).join(' ')} ${lastNames[0] || ''}`.trim();
  };

  const formatLunchAlarm = (): string => {
    const stored = getStoredLunchTime();
    if (!stored) return '';
    const [h, m] = stored.split(':').map(Number);
    const alarmMin = h * 60 + m - 10;
    return minutesToTime(alarmMin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      {/* Rotating JB Logo */}
      <style>{`
@keyframes rotateJB {
  0% { transform: perspective(600px) rotateY(-25deg); }
  50% { transform: perspective(600px) rotateY(25deg); }
  100% { transform: perspective(600px) rotateY(-25deg); }
}
.logo-jb {
  animation: rotateJB 4s ease-in-out infinite;
  transform-style: preserve-3d;
}
`}</style>
      <div className="fixed left-4 top-4 z-[60] flex h-28 w-28 items-center justify-center overflow-visible rounded-xl border border-primary/20 bg-background/80 shadow-lg backdrop-blur-sm">
        <img
          src="/v0-ailoginandpanel/logo.png"
          alt="JB"
          className="logo-jb h-24 w-auto"
        />
      </div>
      <div className="w-full max-w-lg">
        {/* Tarjeta principal */}
        <div className="rounded-2xl border border-primary/20 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
          {/* Employee Photo */}
          <div className="mb-6 flex justify-center">
            {empleado?.foto ? (
              <Avatar className="h-24 w-24 ring-2 ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src={empleado.foto} alt={`${empleado.nombres} ${empleado.apellidos}`} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/50 text-2xl font-bold text-white">
                  {empleado.nombres?.charAt(0)}{empleado.apellidos?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/50 shadow-[0_0_40px_rgba(0,150,255,0.3)]">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <>
              {/* Greeting */}
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-foreground">
                  {greeting}, <span className="text-primary">{getEmployeeName()}</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground italic">&ldquo;{phrase}&rdquo;</p>
              </div>

              {/* Icono del día */}
              <div className="mb-6 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
                  <Calendar className="h-4 w-4" />
                  {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][day]}
                </div>
                {isWeekend && (
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
                    🎉 Descanso
                  </span>
                )}
              </div>

              {/* Horario del día */}
              {isSaturday ? (
                <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Sábado - Horario
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Entrada: <span className="font-medium text-foreground">7:00 AM</span></p>
                    {getStoredSatExitTime() && (
                      <p>
                        Salida: <span className="font-medium text-foreground">{getStoredSatExitTime()}</span>
                      </p>
                    )}
                    {getStoredSatEatCompany() && getStoredSatLunchTime() && (
                      <p>
                        Almuerzo: <span className="font-medium text-foreground">{getStoredSatLunchTime()}</span>
                        {' → '}
                        Alarma: <span className="font-medium text-amber-500">{formatLunchAlarm()}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : !isWeekend && dayInfo && (
                <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Horario de hoy
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Entrada: <span className="font-medium text-foreground">7:00 AM</span></p>
                    <p>
                      Salida:{' '}
                      <span className="font-medium text-foreground">{dayInfo.base}</span>
                      {empleado?.sexo === 'femenino' && empleado?.embarazada && (
                        <span className="ml-2 rounded bg-pink-500/10 px-2 py-0.5 text-xs text-pink-500">
                          <Heart className="mr-1 inline h-3 w-3" />
                          -10min embarazo
                        </span>
                      )}
                    </p>
                    {getStoredLunchTime() && (
                      <p>
                        Almuerzo: <span className="font-medium text-foreground">{getStoredLunchTime()}</span>
                        {' → '}
                        Alarma: <span className="font-medium text-amber-500">{formatLunchAlarm()}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Embarazo / Lactancia info */}
              {empleado?.sexo === 'femenino' && empleado?.embarazada && (
                <div className="mb-6 rounded-xl border border-pink-500/30 bg-pink-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-pink-500">
                    <Baby className="h-4 w-4" />
                    Estado de Embarazo detectado
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {empleado.semanasEmbarazo ? `Semana ${empleado.semanasEmbarazo} de embarazo. ` : ''}
                    La alarma de salida sonará 20 minutos antes para que puedas retirarte.
                  </p>
                </div>
              )}

              {/* Saturday Prompt */}
              {isSaturday && needsSatPrompt && (
                <div className="mb-6 space-y-3">
                  {/* Exit time */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-500">
                      <LogOut className="h-4 w-4" />
                      ¿A qué hora sales hoy? (Sábado)
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={satExitTime}
                        onChange={(e) => setSatExitTime(e.target.value)}
                        className="border-blue-500/50 bg-input font-mono"
                      />
                    </div>
                  </div>

                  {/* Eat at company */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-500">
                      <Coffee className="h-4 w-4" />
                      ¿Vas a almorzar en la empresa?
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant={satEatCompany === true ? 'default' : 'outline'}
                        className={satEatCompany === true ? 'bg-amber-600 text-white' : ''}
                        onClick={() => setSatEatCompany(true)}
                      >
                        Sí
                      </Button>
                      <Button
                        size="sm"
                        variant={satEatCompany === false ? 'default' : 'outline'}
                        className={satEatCompany === false ? 'bg-amber-600 text-white' : ''}
                        onClick={() => setSatEatCompany(false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>

                  {/* Lunch time (only if eating at company) */}
                  {satEatCompany && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-500">
                        <Clock className="h-4 w-4" />
                        ¿A qué hora almuerzas?
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={satLunchTime}
                          onChange={(e) => setSatLunchTime(e.target.value)}
                          className="border-green-500/50 bg-input font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleSatSave}
                    disabled={!satExitTime || (satEatCompany === null)}
                  >
                    Guardar horario de Sábado
                  </Button>
                </div>
              )}

              {satSaved && (
                <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-center text-sm text-green-500">
                  <LogOut className="mr-2 inline h-4 w-4" />
                  ¡Recordatorios de Sábado programados! Salida: {getStoredSatExitTime()}
                  {getStoredSatEatCompany() && ` · Almuerzo: ${getStoredSatLunchTime()}`}
                </div>
              )}

              {/* Weekday Lunch Prompt */}
              {!isSaturday && needsLunchPrompt && (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-500">
                    <Coffee className="h-4 w-4" />
                    ¿A qué hora almuerzas hoy?
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Selecciona tu hora de almuerzo para programar un recordatorio semanal.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={lunchTime}
                      onChange={(e) => setLunchTime(e.target.value)}
                      className="border-amber-500/50 bg-input font-mono"
                    />
                    <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={handleLunchSave}>
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {!isSaturday && lunchSaved && (
                <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-center text-sm text-green-500">
                  <Coffee className="mr-2 inline h-4 w-4" />
                  ¡Recordatorio de almuerzo programado a las {formatLunchAlarm()}!
                </div>
              )}

              {/* Enter button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40"
                  onClick={handleEnter}
                >
                  Entrar al Panel
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Version info */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          SCA - JB v1.0 · Asistente Inteligente
        </p>
      </div>
    </div>
  );
}
