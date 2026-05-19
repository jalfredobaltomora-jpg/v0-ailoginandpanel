'use client';

import { useState, useEffect } from 'react';
import { X, Cake, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { parseDateLocal } from '@/lib/utils';
import { type Empleado } from '@/lib/firebase';

interface EmployeeInfoModalProps {
  empleado: Empleado;
  onClose: () => void;
}

function getTimeUntilNextBirthday(fechaNac: string) {
  const today = new Date();
  const birth = parseDateLocal(fechaNac);
  let nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday <= today) {
    nextBirthday = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }
  const diffMs = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const weeks = Math.floor((diffDays % 30) / 7);
  const days = diffDays % 7;
  return { months, weeks, days, totalDays: diffDays };
}

function calcEdad(fechaNac: string) {
  if (!fechaNac) return null;
  const birth = parseDateLocal(fechaNac);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(emp: Empleado) {
  const n = emp.nombres?.charAt(0) || '';
  const a = emp.apellidos?.charAt(0) || '';
  return (n + a).toUpperCase() || 'EM';
}

function formatDate(fechaNac: string) {
  if (!fechaNac) return '';
  const date = parseDateLocal(fechaNac);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function EmployeeInfoModal({ empleado, onClose }: EmployeeInfoModalProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextBirthday(empleado.fechaNac));
  const edad = calcEdad(empleado.fechaNac);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilNextBirthday(empleado.fechaNac));
    }, 60000);
    return () => clearInterval(timer);
  }, [empleado.fechaNac]);

  const isBirthdayToday = () => {
    const today = new Date();
    const birth = parseDateLocal(empleado.fechaNac);
    return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card">
        <CardHeader className="flex-row items-center justify-between border-b border-border">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Cake className="h-5 w-5" />
            Informacion del Trabajador
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 text-center">
          {/* Photo */}
          <div className="mb-4 flex justify-center">
            <div className="rounded-full p-1 bg-gradient-to-br from-primary via-pink-400 to-purple-400">
              <Avatar className="h-28 w-28 border-4 border-white">
                <AvatarImage src={empleado.foto} alt={`${empleado.nombres} ${empleado.apellidos}`} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {getInitials(empleado)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold text-foreground">
            {empleado.nombres} {empleado.apellidos}
          </h2>
          <p className="text-sm text-muted-foreground">{empleado.cargo} - {empleado.area}</p>

          {/* Birth date info */}
          <div className="my-6 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Fecha de Nacimiento: <strong>{formatDate(empleado.fechaNac)}</strong></span>
            </div>
            {edad !== null && (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Edad Actual: <strong>{edad} anos</strong></span>
              </div>
            )}
          </div>

          {/* Countdown */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              {isBirthdayToday() ? (
                <span className="text-amber-500 font-bold">HOY ES SU CUMPLEANOS! </span>
              ) : (
                'Tiempo restante para su proximo cumpleanos:'
              )}
            </p>
            <div className="flex justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">{timeLeft.months}</span>
                <span className="text-xs text-muted-foreground">Meses</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">{timeLeft.weeks}</span>
                <span className="text-xs text-muted-foreground">Semanas</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary">{timeLeft.days}</span>
                <span className="text-xs text-muted-foreground">Dias</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              ({timeLeft.totalDays} dias en total)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
