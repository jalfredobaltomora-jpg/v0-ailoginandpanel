'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, User, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllPermisos, getEmpleados, createPermiso, updatePermiso, type Permiso, type Empleado } from '@/lib/firebase';

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const estadoStyles: Record<string, string> = {
  aprobado: 'bg-green-500/20 text-green-500',
  pendiente: 'bg-amber-500/20 text-amber-500',
  rechazado: 'bg-red-500/20 text-red-500',
};

const estadoLabels: Record<string, string> = {
  aprobado: 'Aprobado',
  pendiente: 'Pendiente',
  rechazado: 'Rechazado',
};

const tipoLabels: Record<string, string> = {
  medico: 'Medico',
  personal: 'Personal',
};

export function PermisosManager() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  // New permiso form
  const [showForm, setShowForm] = useState(false);
  const [newEmpleadoCode, setNewEmpleadoCode] = useState('');
  const [newFecha, setNewFecha] = useState(new Date().toISOString().split('T')[0]);
  const [newTipo, setNewTipo] = useState<'medico' | 'personal'>('personal');
  const [newMotivo, setNewMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [p, e] = await Promise.all([getAllPermisos(), getEmpleados()]);
    setPermisos(p);
    setEmpleados(e.filter(emp => emp.activo !== false));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getEmpleado = (code: string) => empleados.find(e => e.code === code);

  const filtered = permisos.filter(p => {
    const emp = getEmpleado(p.empleadoCode);
    const nameMatch = !search || `${emp?.nombres} ${emp?.apellidos} ${emp?.code}`.toLowerCase().includes(search.toLowerCase());
    const tipoMatch = filterTipo === 'todos' || p.tipo === filterTipo;
    const estadoMatch = filterEstado === 'todos' || p.estado === filterEstado;
    return nameMatch && tipoMatch && estadoMatch;
  });

  const handleCreate = async () => {
    if (!newEmpleadoCode || !newFecha || !newMotivo.trim()) return;
    setSaving(true);
    const id = await createPermiso({
      empleadoCode: newEmpleadoCode,
      fecha: newFecha,
      tipo: newTipo,
      motivo: newMotivo.trim(),
      estado: 'pendiente',
    });
    if (id) {
      await loadData();
      setShowForm(false);
      setNewEmpleadoCode('');
      setNewMotivo('');
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, estado: 'aprobado' | 'rechazado') => {
    await updatePermiso(id, { estado });
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      {showForm && (
        <Card className="border-primary/20 bg-card/95">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              Nuevo Permiso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">Empleado</label>
                <Select value={newEmpleadoCode} onValueChange={setNewEmpleadoCode}>
                  <SelectTrigger className="border-border bg-input">
                    <SelectValue placeholder="Seleccionar empleado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {empleados.map(emp => (
                        <SelectItem key={emp.code} value={emp.code}>
                          {emp.code} - {emp.nombres} {emp.apellidos}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">Fecha</label>
                <Input type="date" value={newFecha} onChange={(e) => setNewFecha(e.target.value)} className="border-border bg-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">Tipo</label>
                <Select value={newTipo} onValueChange={(v) => setNewTipo(v as 'medico' | 'personal')}>
                  <SelectTrigger className="border-border bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="medico">Medico</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">Motivo</label>
                <Input value={newMotivo} onChange={(e) => setNewMotivo(e.target.value)} placeholder="Describa el motivo..." className="border-border bg-input" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving || !newEmpleadoCode || !newMotivo.trim()} className="bg-primary text-primary-foreground">
                {saving ? 'Guardando...' : 'Crear Permiso'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permisos List */}
      <Card className="border-primary/20 bg-card/95">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              Permisos Registrados
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              {showForm ? 'Cerrar' : 'Nuevo Permiso'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filters */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o codigo..."
                className="w-full border-border bg-input pl-9"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-36 border-border bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="medico">Medico</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-36 border-border bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No hay permisos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const emp = getEmpleado(p.empleadoCode);
                return (
                  <div key={p.id} className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-4">
                    <Avatar className="h-12 w-12 border border-primary/30">
                      <AvatarImage src={emp?.foto} alt={emp?.nombres} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {(emp?.nombres?.charAt(0) || '') + (emp?.apellidos?.charAt(0) || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {emp?.nombres} {emp?.apellidos}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{p.empleadoCode}</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(p.fecha)}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          p.tipo === 'medico' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                        }`}>
                          {tipoLabels[p.tipo]}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${estadoStyles[p.estado]}`}>
                          {estadoLabels[p.estado]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.motivo}</p>
                    </div>
                    {p.estado === 'pendiente' && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(p.id, 'aprobado')} className="text-green-500 hover:text-green-400 hover:bg-green-500/10">
                          <CheckCircle className="h-5 w-5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(p.id, 'rechazado')} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
