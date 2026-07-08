'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Cake, Clock, FileCheck, ClipboardCheck, Timer, Search, Plus, Edit, Trash2, Gift, PartyPopper, Sparkles, CalendarDays, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStoredUser } from '@/lib/auth-store';
import { parseDateLocal } from '@/lib/utils';
import type { Empleado, UsuarioIT } from '@/lib/firebase';
import { tienePermisoEnGrupo, puedeVer } from '@/lib/permisos';
import { useLang } from '@/lib/lang-context';

const EmployeeFormModal = dynamic(() => import('@/components/rrhh/employee-form-modal').then(m => m.EmployeeFormModal), { ssr: false });
const EmployeeInfoModal = dynamic(() => import('@/components/rrhh/employee-info-modal').then(m => m.EmployeeInfoModal), { ssr: false });
const BirthdayCardModal = dynamic(() => import('@/components/rrhh/birthday-card-modal').then(m => m.BirthdayCardModal), { ssr: false });
const AsistenciaView = dynamic(() => import('@/components/rrhh/asistencia-view').then(m => m.AsistenciaView), { ssr: false });
const ClockIn = dynamic(() => import('@/components/rrhh/clock-in').then(m => m.ClockIn), { ssr: false });
const PermisosManager = dynamic(() => import('@/components/rrhh/permisos-manager').then(m => m.PermisosManager), { ssr: false });

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
  const { t } = useLang();
  const [currentUser, setCurrentUser] = useState<UsuarioIT | null>(null);
  const [view, setView] = useState<'tiles' | 'catalogo' | 'cumpleaneros' | 'reloj' | 'permisos' | 'asistencia'>('tiles');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [birthdayEmpleado, setBirthdayEmpleado] = useState<Empleado | null>(null);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const [infoEmpleado, setInfoEmpleado] = useState<Empleado | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [marcasHoy, setMarcasHoy] = useState<Record<string, any>>({});

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push('/');
      return;
    }
    if (!tienePermisoEnGrupo(user, 'rrhh_')) {
      router.push('/panel');
    }
    setCurrentUser(user);
  }, [router]);

  // Real-time Firebase listener for empleados
  useEffect(() => {
    if (view !== 'catalogo' && view !== 'cumpleaneros' && view !== 'reloj' && view !== 'permisos' && view !== 'asistencia') return;

    let unsubscribe: () => void;

    import('@/lib/firebase').then(({ ref, onValue, db }) => {
      setLoading(true);
      const empleadosRef = ref(db, 'empleados');
      unsubscribe = onValue(empleadosRef, (snapshot) => {
        const data = snapshot.val();
        setEmpleados(data ? Object.values(data) : []);
        setLoading(false);
      }, () => {
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [view]);

  // Fetch today's attendance for catalog stats
  useEffect(() => {
    if (view !== 'catalogo') return;
    const today = new Date().toISOString().split('T')[0];
    import('@/lib/firebase').then(({ getMarcasDelDia }) => {
      getMarcasDelDia(today).then(setMarcasHoy).catch(() => {});
    });
  }, [view]);

  // Filter by active/inactive status and search term
  const filteredEmpleados = empleados.filter((e) => {
    const isActivo = e.activo !== false;
    const matchesStatus = showInactivos ? !isActivo : isActivo;
    const matchesSearch = 
      `${e.nombres} ${e.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
      e.code.includes(search) ||
      e.area.toLowerCase().includes(search.toLowerCase()) ||
      e.cedula.includes(search);
    return matchesStatus && matchesSearch;
  });

  const calcEdad = (fechaNac: string) => {
    if (!fechaNac) return '-';
    const birth = parseDateLocal(fechaNac);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getInitials = (emp: Empleado) => {
    const n = emp.nombres?.charAt(0) || '';
    const a = emp.apellidos?.charAt(0) || '';
    return (n + a).toUpperCase() || 'EM';
  };

  // Get employees with birthdays this month
  const getBirthdayEmpleados = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    return empleados
      .filter(e => {
        if (!e.fechaNac || e.activo === false) return false;
        const birthDate = parseDateLocal(e.fechaNac);
        return birthDate.getMonth() === currentMonth;
      })
      .sort((a, b) => {
        const dayA = parseDateLocal(a.fechaNac).getDate();
        const dayB = parseDateLocal(b.fechaNac).getDate();
        const diffA = dayA >= currentDay ? dayA - currentDay : 31 - currentDay + dayA;
        const diffB = dayB >= currentDay ? dayB - currentDay : 31 - currentDay + dayB;
        return diffA - diffB;
      });
  };

  const isBirthdayToday = (fechaNac: string) => {
    if (!fechaNac) return false;
    const today = new Date();
    const birth = parseDateLocal(fechaNac);
    return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
  };

  const formatBirthdayDate = (fechaNac: string) => {
    if (!fechaNac) return '';
    const date = parseDateLocal(fechaNac);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  // Get all employees sorted by birthday (month/day proximity)
  const getAllSortedByBirthday = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    return empleados
      .filter(e => e.fechaNac && e.activo !== false)
      .sort((a, b) => {
        const dateA = parseDateLocal(a.fechaNac);
        const dateB = parseDateLocal(b.fechaNac);
        const dayA = dateA.getDate();
        const dayB = dateB.getDate();
        const monthA = dateA.getMonth();
        const monthB = dateB.getMonth();
        const nextA = monthA > currentMonth || (monthA === currentMonth && dayA >= currentDay)
          ? (monthA - currentMonth) * 30 + (dayA - currentDay)
          : (12 - currentMonth + monthA) * 30 + (dayA - currentDay);
        const nextB = monthB > currentMonth || (monthB === currentMonth && dayB >= currentDay)
          ? (monthB - currentMonth) * 30 + (dayB - currentDay)
          : (12 - currentMonth + monthB) * 30 + (dayB - currentDay);
        return nextA - nextB;
      });
  };

  const handleBirthdayClick = (emp: Empleado) => {
    setBirthdayEmpleado(emp);
    setIsBirthdayModalOpen(true);
  };

  const handleEmployeeInfoClick = (emp: Empleado) => {
    setInfoEmpleado(emp);
    setIsInfoModalOpen(true);
  };

  const handleCloseBirthdayModal = () => {
    setIsBirthdayModalOpen(false);
    setBirthdayEmpleado(null);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setInfoEmpleado(null);
  };

  const handleDoubleClick = (emp: Empleado) => {
    setSelectedEmpleado(emp);
    setIsCreatingNew(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedEmpleado(null);
    setIsCreatingNew(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmpleado(null);
    setIsCreatingNew(false);
  };

  const handleSaved = () => {};

  const handleDelete = async (emp: Empleado) => {
    if (confirm(`Está seguro de eliminar a ${emp.nombres} ${emp.apellidos} (${emp.code})?`)) {
      const { deleteEmpleado } = await import('@/lib/firebase');
      await deleteEmpleado(emp.code);
    }
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
            {view === 'tiles' ? t('common.back') : t('common.back')}
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
            {puedeVer(currentUser, 'rrhh_catalogo') && (
              <Tile
                title="Catalogo"
                subtitle="Empleados"
                icon={<Users className="h-8 w-8" />}
                color="bg-gradient-to-br from-blue-500 to-blue-700"
                onClick={() => setView('catalogo')}
              />
            )}
            {puedeVer(currentUser, 'rrhh_cumpleanieros') && (
              <Tile
                title="Cumpleañeros"
                subtitle="Este mes"
                icon={<Cake className="h-8 w-8" />}
                color="bg-gradient-to-br from-pink-500 to-pink-700"
                onClick={() => setView('cumpleaneros')}
              />
            )}
            {puedeVer(currentUser, 'rrhh_reloj') && (
              <Tile
                title="Reloj E/S"
                subtitle="Entrada / Salida"
                icon={<Clock className="h-8 w-8" />}
                color="bg-gradient-to-br from-teal-500 to-teal-700"
                onClick={() => setView('reloj')}
              />
            )}
            {puedeVer(currentUser, 'rrhh_permisos') && (
              <Tile
                title="Permisos"
                subtitle="Solicitudes"
                icon={<FileCheck className="h-8 w-8" />}
                color="bg-gradient-to-br from-orange-500 to-orange-700"
                onClick={() => setView('permisos')}
              />
            )}
            {puedeVer(currentUser, 'rrhh_asistencia') && (
              <Tile
                title="Asistencia"
                subtitle="Registro diario"
                icon={<ClipboardCheck className="h-8 w-8" />}
                color="bg-gradient-to-br from-purple-500 to-purple-700"
                onClick={() => setView('asistencia')}
              />
            )}
            {puedeVer(currentUser, 'rrhh_horasextras') && (
              <Tile
                title="Horas Extras"
                subtitle="Registro"
                icon={<Timer className="h-8 w-8" />}
                color="bg-gradient-to-br from-red-500 to-red-700"
                onClick={() => {}}
              />
            )}
          </div>
        )}

        {view === 'catalogo' && (
          <Card className="mx-auto max-w-5xl border-primary/20 bg-card/95">
            <CardHeader className="flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                {showInactivos ? 'Catalogo de Personal Inactivos' : 'Catalogo de Personal Activo'}
              </CardTitle>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Active/Inactive Switch */}
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className={`text-sm ${!showInactivos ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    Activos
                  </span>
                  <Switch
                    checked={showInactivos}
                    onCheckedChange={setShowInactivos}
                  />
                  <span className={`text-sm ${showInactivos ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    Inactivos
                  </span>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-64 border-border bg-input pl-9"
                  />
                </div>
                <Button onClick={handleCreateNew} className="bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Doble click para ver detalles del empleado
              </p>
              {!showInactivos && (
                <div className="mb-6 flex flex-wrap items-center gap-6">
                  <span className="flex items-center gap-3 rounded-xl border-2 border-border bg-card px-6 py-4 shadow-sm">
                    <Users className="h-8 w-8 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</span>
                      <strong className="text-2xl font-bold text-primary">{filteredEmpleados.length}</strong>
                    </div>
                  </span>
                  <span className="flex items-center gap-3 rounded-xl border-2 border-green-500/30 bg-green-500/5 px-6 py-4 shadow-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                      <span className="h-3 w-3 rounded-full bg-green-500" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-wide text-green-700">Presentes</span>
                      <strong className="text-2xl font-bold text-green-600">{filteredEmpleados.filter(e => marcasHoy[e.code]).length}</strong>
                    </div>
                  </span>
                  <span className="flex items-center gap-3 rounded-xl border-2 border-red-500/30 bg-red-500/5 px-6 py-4 shadow-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-wide text-red-700">Ausentes</span>
                      <strong className="text-2xl font-bold text-red-600">{filteredEmpleados.filter(e => !marcasHoy[e.code]).length}</strong>
                    </div>
                  </span>
                </div>
              )}
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">Cargando...</div>
              ) : filteredEmpleados.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {showInactivos ? 'No hay empleados inactivos' : 'No hay empleados registrados'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEmpleados.map((emp) => (
                    <div
                      key={emp.code}
                      onDoubleClick={() => handleDoubleClick(emp)}
                      className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      {/* Avatar with photo */}
                      <Avatar className="h-14 w-14 border-2 border-primary/30">
                        <AvatarImage src={emp.foto} alt={`${emp.nombres} ${emp.apellidos}`} />
                        <AvatarFallback className="bg-primary/20 text-primary text-lg">
                          {getInitials(emp)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-xs text-primary">
                            {emp.code}
                          </span>
                          <span className="font-medium text-foreground truncate">
                            {emp.nombres} {emp.apellidos}
                          </span>
                          {emp.activo !== false ? (
                            <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-400">
                              Activo
                            </span>
                          ) : (
                            <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">Cédula:</span> {emp.cedula} | {' '}
                          <span className="font-medium">Cargo:</span> {emp.cargo} | {' '}
                          <span className="font-medium">Área:</span> {emp.area} | {' '}
                          <span className="font-medium">Edad:</span> {calcEdad(emp.fechaNac)}
                          {emp.renewalCount ? ` | Renov.: ${emp.renewalCount}` : ''}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{emp.sexo === 'femenino' ? '♀' : '♂'} {emp.sexo}</span>
                          <span className="text-border">|</span>
                          <span>Hijos: {emp.hijos ?? 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {emp.renewalCount ? (
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500" title="Veces que ha renovado contrato">
                            x{emp.renewalCount}
                          </span>
                        ) : (
                          <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-500" title="Sin renovaciones">
                            1ra vez
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={(e) => { e.stopPropagation(); handleDelete(emp); }}
                          title="Eliminar empleado"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {view === 'cumpleaneros' && (
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Section: Cumpleañeros del Mes */}
            <Card className="border-pink-500/30 bg-card/95">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-pink-500">
                  <Cake className="h-5 w-5" />
                  Cumpleañeros del Mes
                  <span className="ml-2 rounded-full bg-pink-500/20 px-3 py-0.5 text-sm font-bold">
                    {new Date().toLocaleDateString('es-ES', { month: 'long' })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Click para crear una tarjeta de cumpleaños personalizada
                </p>
                
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">Cargando...</div>
                ) : getBirthdayEmpleados().length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Gift className="mx-auto h-10 w-10 mb-3 opacity-50" />
                    No hay cumpleañeros este mes
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {getBirthdayEmpleados().map((emp) => (
                      <div
                        key={emp.code}
                        onClick={() => handleBirthdayClick(emp)}
                        className={`relative overflow-hidden rounded-xl border-2 p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                          isBirthdayToday(emp.fechaNac)
                            ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50 dark:from-amber-950/30 dark:via-pink-950/30 dark:to-purple-950/30'
                            : 'border-border bg-muted/20 hover:border-pink-400'
                        }`}
                      >
                        {isBirthdayToday(emp.fechaNac) && (
                          <div className="absolute -top-1 -right-1">
                            <div className="flex items-center gap-1 rounded-bl-lg rounded-tr-lg bg-gradient-to-r from-amber-500 to-pink-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                              <PartyPopper className="h-3 w-3" />
                              HOY
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div className={`rounded-full p-0.5 ${
                            isBirthdayToday(emp.fechaNac)
                              ? 'bg-gradient-to-br from-amber-400 via-pink-400 to-purple-400'
                              : 'bg-gradient-to-br from-pink-300 to-purple-300'
                          }`}>
                            <Avatar className="h-16 w-16 border-2 border-white dark:border-card">
                              <AvatarImage src={emp.foto} alt={`${emp.nombres} ${emp.apellidos}`} />
                              <AvatarFallback className="bg-gradient-to-br from-pink-100 to-purple-100 text-pink-700 text-lg">
                                {getInitials(emp)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {emp.nombres} {emp.apellidos}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {emp.cargo} - {emp.area}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Cake className="h-3 w-3 text-pink-500" />
                              <span className={`text-sm font-medium ${
                                isBirthdayToday(emp.fechaNac) ? 'text-amber-600' : 'text-pink-600'
                              }`}>
                                {formatBirthdayDate(emp.fechaNac)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({calcEdad(emp.fechaNac)} años)
                              </span>
                            </div>
                          </div>
                          
                          <Gift className={`h-8 w-8 ${
                            isBirthdayToday(emp.fechaNac)
                              ? 'text-amber-500 animate-bounce'
                              : 'text-pink-300'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section: Todos los Cumpleañeros */}
            <Card className="border-primary/20 bg-card/95">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-5 w-5" />
                  Todos los Cumpleañeros del Año
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Click para ver información del trabajador
                </p>
                
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">Cargando...</div>
                ) : getAllSortedByBirthday().length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No hay empleados registrados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getAllSortedByBirthday().map((emp) => (
                      <div
                        key={emp.code}
                        onClick={() => handleEmployeeInfoClick(emp)}
                        className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <Avatar className="h-12 w-12 border-2 border-primary/30">
                          <AvatarImage src={emp.foto} alt={`${emp.nombres} ${emp.apellidos}`} />
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {getInitials(emp)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {emp.nombres} {emp.apellidos}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className={`rounded px-1.5 py-0.5 ${
                              isBirthdayToday(emp.fechaNac)
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-pink-500/20 text-pink-500'
                            }`}>
                              {formatBirthdayDate(emp.fechaNac)}
                            </span>
                            <span>{calcEdad(emp.fechaNac)} años</span>
                            <span>{emp.cargo}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'reloj' && (
          <ClockIn />
        )}

        {view === 'permisos' && (
          <PermisosManager />
        )}

        {view === 'asistencia' && (
          <AsistenciaView />
        )}
      </div>

      {/* Employee Form Modal */}
      {isModalOpen && (
        <EmployeeFormModal
          empleado={isCreatingNew ? null : selectedEmpleado}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          currentUser={currentUser}
        />
      )}

      {/* Birthday Card Modal */}
      {isBirthdayModalOpen && birthdayEmpleado && (
        <BirthdayCardModal
          empleado={birthdayEmpleado}
          onClose={handleCloseBirthdayModal}
        />
      )}

      {/* Employee Info Modal */}
      {isInfoModalOpen && infoEmpleado && (
        <EmployeeInfoModal
          empleado={infoEmpleado}
          onClose={handleCloseInfoModal}
        />
      )}
    </main>
  );
}
