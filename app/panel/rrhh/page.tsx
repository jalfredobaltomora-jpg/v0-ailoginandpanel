'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Cake, Clock, FileCheck, ClipboardCheck, Timer, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getEmpleados, saveEmpleado, type Empleado, type UsuarioIT } from '@/lib/firebase';

interface TileProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function Tile({ title, subtitle, icon, color, onClick }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative min-h-36 min-w-36 overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg ${color}`}
    >
      <div className="relative z-10">
        <div className="mb-2 text-3xl text-white/90">{icon}</div>
        <div className="font-bold text-white">{title}</div>
        <div className="text-xs text-white/70">{subtitle}</div>
      </div>
    </button>
  );
}

export default function RRHHPage() {
  const router = useRouter();
  const [view, setView] = useState<'tiles' | 'catalogo'>('tiles');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
      router.push('/');
      return;
    }
  }, [router]);

  const loadEmpleados = async () => {
    setLoading(true);
    const data = await getEmpleados();
    setEmpleados(data);
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'catalogo') {
      loadEmpleados();
    }
  }, [view]);

  const filteredEmpleados = empleados.filter((e) =>
    `${e.nombres} ${e.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
    e.code.includes(search) ||
    e.area.toLowerCase().includes(search.toLowerCase())
  );

  const calcEdad = (fechaNac: string) => {
    if (!fechaNac) return '-';
    const birth = new Date(fechaNac);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => view === 'tiles' ? router.push('/panel') : setView('tiles')}
            className="border-border"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {view === 'tiles' ? 'Regresar' : 'Volver'}
          </Button>
          <h2 className="text-xl font-bold">
            <span className="text-primary">RRHH</span>{' '}
            <span className="text-foreground">(Panel)</span>
          </h2>
        </div>
      </div>

      <div className="p-8">
        {view === 'tiles' && (
          <div className="flex flex-wrap justify-center gap-6">
            <Tile
              title="Catalogo"
              subtitle="Empleados"
              icon={<Users className="h-8 w-8" />}
              color="bg-gradient-to-br from-blue-500 to-blue-700"
              onClick={() => setView('catalogo')}
            />
            <Tile
              title="Cumpleaneros"
              subtitle="Calendario"
              icon={<Cake className="h-8 w-8" />}
              color="bg-gradient-to-br from-pink-500 to-pink-700"
              onClick={() => {}}
            />
            <Tile
              title="Reloj E/S"
              subtitle="Entrada / Salida"
              icon={<Clock className="h-8 w-8" />}
              color="bg-gradient-to-br from-teal-500 to-teal-700"
              onClick={() => {}}
            />
            <Tile
              title="Permisos"
              subtitle="Solicitudes"
              icon={<FileCheck className="h-8 w-8" />}
              color="bg-gradient-to-br from-orange-500 to-orange-700"
              onClick={() => {}}
            />
            <Tile
              title="Asistencia"
              subtitle="Registro diario"
              icon={<ClipboardCheck className="h-8 w-8" />}
              color="bg-gradient-to-br from-purple-500 to-purple-700"
              onClick={() => {}}
            />
            <Tile
              title="Horas Extras"
              subtitle="Registro"
              icon={<Timer className="h-8 w-8" />}
              color="bg-gradient-to-br from-red-500 to-red-700"
              onClick={() => {}}
            />
          </div>
        )}

        {view === 'catalogo' && (
          <Card className="mx-auto max-w-5xl border-primary/20 bg-card/95">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Catalogo de Empleados
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-64 border-border bg-input pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Cargando...</div>
              ) : filteredEmpleados.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No hay empleados registrados
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEmpleados.map((emp) => (
                    <div
                      key={emp.code}
                      className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-4 hover:bg-muted/40"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-2xl text-primary">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-xs text-primary">
                            {emp.code}
                          </span>
                          <span className="font-medium text-foreground">
                            {emp.nombres} {emp.apellidos}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {emp.cargo} | {emp.area} | Edad: {calcEdad(emp.fechaNac)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
