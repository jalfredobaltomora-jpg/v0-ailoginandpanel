'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, User, LogIn, LogOut, Scan, Sun, Moon, Sunrise, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getEmpleadoByCodigo, getMarcaAsistencia, registrarEntrada, registrarSalida, getPermisoDelDia, listenToAsistencia, type Empleado, type MarcaAsistencia } from '@/lib/firebase';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function getDayType(): 'mon-fri' | 'tue-thu' {
  const day = new Date().getDay();
  return day === 1 || day === 5 ? 'mon-fri' : 'tue-thu';
}

function getExitHour(): { hour: number; minute: number } {
  return getDayType() === 'mon-fri' ? { hour: 17, minute: 0 } : { hour: 18, minute: 0 };
}

function getExitTimeForEmployee(emp: Empleado): { hour: number; minute: number } {
  const base = getExitHour();
  if (emp.embarazada || emp.discapacidad) {
    const d = new Date();
    d.setHours(base.hour, base.minute - 10, 0, 0);
    return { hour: d.getHours(), minute: d.getMinutes() };
  }
  return base;
}

function canExit(emp: Empleado, hasPermiso: boolean): { allowed: boolean; reason: string } {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const exit = getExitTimeForEmployee(emp);
  const exitMinutes = exit.hour * 60 + exit.minute;

  if (currentMinutes >= exitMinutes) {
    return { allowed: true, reason: '' };
  }

  if (hasPermiso) {
    return { allowed: true, reason: 'Salida anticipada por permiso registrado' };
  }

  const diff = exitMinutes - currentMinutes;
  return {
    allowed: false,
    reason: `Aun no puede marcar salida. Faltan ${Math.floor(diff / 60)}h ${diff % 60}m (${exit.hour.toString().padStart(2, '0')}:${exit.minute.toString().padStart(2, '0')})`,
  };
}

function generarMensajeIA(
  emp: Empleado,
  tipo: 'entrada' | 'salida',
  permiso: { tipo: string } | null
): string {
  const now = new Date();
  const hour = now.getHours();

  let saludo = '';
  if (hour < 12) saludo = 'Buenos dias';
  else if (hour < 18) saludo = 'Buenas tardes';
  else saludo = 'Buenas noches';

  if (tipo === 'entrada') {
    let msg = `${saludo} ${emp.nombres.split(' ')[0]} ${emp.apellidos.split(' ')[0]}`;

    if (permiso) {
      if (permiso.tipo === 'medico') {
        msg += '. Espero que te encuentres mejor de salud.';
      } else {
        msg += '. Espero que hayas resuelto tu asunto pendiente.';
      }
    } else if (hour < 12) {
      msg += ', que tengas un excelente día de trabajo hoy';
    } else {
      msg += ', gracias por venir';
    }

    return msg + '!';
  } else {
    let msg = `Hasta luego ${emp.nombres.split(' ')[0]}`;

    if (permiso) {
      if (permiso.tipo === 'medico') {
        msg += ', que te recuperes pronto';
      } else {
        msg += ', espero todo este bien';
      }
    } else if (hour < 18) {
      msg += ', que tengas buena tarde';
    } else {
      msg += ', que tengas buena noche';
    }

    return msg + '!';
  }
}

export function ClockIn() {
  const [scannedCode, setScannedCode] = useState('');
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [marca, setMarca] = useState<MarcaAsistencia | null>(null);
  const [mensajeIA, setMensajeIA] = useState('');
  const [error, setError] = useState('');
  const [marcasHoy, setMarcasHoy] = useState<Record<string, MarcaAsistencia>>({});
  const [empleadosHoy, setEmpleadosHoy] = useState<{ emp: Empleado; marca: MarcaAsistencia }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = getTodayStr();

  // Listen to today's records
  useEffect(() => {
    const unsub = listenToAsistencia(today, (data) => {
      setMarcasHoy(data);
    });
    return unsub;
  }, [today]);

  // Enrich marcas with employee data
  useEffect(() => {
    async function load() {
      const entries = await Promise.all(
        Object.entries(marcasHoy).map(async ([code, marca]) => {
          const emp = await getEmpleadoByCodigo(code);
          return emp ? { emp, marca } : null;
        })
      );
      setEmpleadosHoy(entries.filter(Boolean) as { emp: Empleado; marca: MarcaAsistencia }[]);
    }
    load();
  }, [marcasHoy]);

  // Auto-focus input for scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle scanner input (usually ends with Enter)
  const handleScan = async (value: string) => {
    const code = value.trim();
    if (!code || code.length < 3) return;

    setScannedCode(code);
    setError('');
    setMensajeIA('');

    const emp = await getEmpleadoByCodigo(code);
    if (!emp || emp.activo === false) {
      setError('Empleado no encontrado o inactivo');
      setEmpleado(null);
      setMarca(null);
      return;
    }

    setEmpleado(emp);

    const todayMarca = await getMarcaAsistencia(today, code);
    const permiso = await getPermisoDelDia(code, today);

    if (!todayMarca || !todayMarca.entrada) {
      // Register entry
      const tipo = permiso ? 'permiso' : 'normal';
      const ok = await registrarEntrada(today, code, tipo, permiso?.id);
      if (ok) {
        setMarca({ entrada: Date.now(), tipo, ...(permiso && { permisoId: permiso.id }) });
        setMensajeIA(generarMensajeIA(emp, 'entrada', permiso));
      } else {
        setError('Error al registrar entrada');
      }
    } else if (!todayMarca.salida) {
      // Check if can exit
      const check = canExit(emp, !!permiso);
      if (check.allowed) {
        const ok = await registrarSalida(today, code);
        if (ok) {
          setMarca({ ...todayMarca, salida: Date.now() });
          setMensajeIA(generarMensajeIA(emp, 'salida', permiso));
        } else {
          setError('Error al registrar salida');
        }
      } else {
        setMarca(todayMarca);
        setMensajeIA(check.reason);
      }
    } else {
      setMarca(todayMarca);
      setMensajeIA(`Ya registraste entrada y salida el día de hoy`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(scannedCode);
    }
  };

  const formatDateLong = () => {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const getHourIcon = () => {
    const h = new Date().getHours();
    if (h < 12) return <Sunrise className="h-5 w-5 text-amber-400" />;
    if (h < 18) return <Sun className="h-5 w-5 text-yellow-500" />;
    return <Moon className="h-5 w-5 text-indigo-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-card/95">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-5 w-5" />
            Reloj Entrada / Salida
            <span className="ml-auto text-sm font-normal text-muted-foreground flex items-center gap-2">
              {getHourIcon()}
              {formatDateLong()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Scanner Input */}
          <div className="relative mb-6">
            <Scan className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escanee su carnet o ingrese el código del empleado..."
              className="border-2 border-primary/30 bg-input pl-10 py-6 text-lg text-center font-mono tracking-widest"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {/* Employee Info Card */}
          {empleado && (
            <div className="mb-6 rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                {/* Photo */}
                <div className="rounded-full p-1 bg-gradient-to-br from-primary via-pink-400 to-purple-400">
                  <Avatar className="h-24 w-24 border-4 border-white">
                    <AvatarImage src={empleado.foto} alt={`${empleado.nombres} ${empleado.apellidos}`} />
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                      {(empleado.nombres?.charAt(0) || '') + (empleado.apellidos?.charAt(0) || '')}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-foreground">
                    {empleado.nombres} {empleado.apellidos}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span><strong>Código:</strong> {empleado.code}</span>
                    <span><strong>Cédula:</strong> {empleado.cedula}</span>
                    <span><strong>Área:</strong> {empleado.area}</span>
                    <span><strong>Cargo:</strong> {empleado.cargo}</span>
                  </div>

                  {/* Entry/Exit badge */}
                  {marca && (
                    <div className="mt-3 flex items-center justify-center sm:justify-start gap-3">
                      {marca.entrada && !marca.salida && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-500">
                          <LogIn className="h-4 w-4" />
                          Entrada: {formatTime(marca.entrada)}
                        </span>
                      )}
                      {marca.salida && (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-500">
                            <LogIn className="h-4 w-4" />
                            Entrada: {formatTime(marca.entrada)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-500">
                            <LogOut className="h-4 w-4" />
                            Salida: {formatTime(marca.salida)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Message */}
              {mensajeIA && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/10 p-4">
                  <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-foreground">{mensajeIA}</p>
                </div>
              )}
            </div>
          )}

          {!empleado && !error && (
            <div className="py-12 text-center text-muted-foreground">
              <Scan className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>Escanee su carnet para registrar entrada o salida</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Records */}
      <Card className="border-primary/20 bg-card/95">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="h-5 w-5" />
            Personal Registrado Hoy
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {empleadosHoy.length} empleados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {empleadosHoy.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p>Nadie ha marcado aun hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {empleadosHoy.map(({ emp, marca: m }) => (
                <div
                  key={emp.code}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <Avatar className="h-10 w-10 border border-primary/30">
                    <AvatarImage src={emp.foto} alt={`${emp.nombres} ${emp.apellidos}`} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {(emp.nombres?.charAt(0) || '') + (emp.apellidos?.charAt(0) || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {emp.nombres} {emp.apellidos}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emp.area} - {emp.cargo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded bg-green-500/15 px-2 py-1 text-green-500">
                      <LogIn className="h-3 w-3" />
                      {formatTime(m.entrada)}
                    </span>
                    {m.salida ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-1 text-blue-500">
                        <LogOut className="h-3 w-3" />
                        {formatTime(m.salida)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-1 text-amber-500">
                        En curso
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
