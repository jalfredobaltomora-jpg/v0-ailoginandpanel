'use client';

import { useState, useEffect, useRef } from 'react';
import { Printer, Search, Plus, Pencil, Trash2, Check, X, Save, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { getEmpleados, getMarcasDelDia, saveMarcaAsistencia, deleteMarcaAsistencia, type Empleado, type MarcaAsistencia } from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatTime(ts: number | undefined): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function parseTimeToTs(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

function tsToTimeInput(ts: number | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function AsistenciaView() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [marcas, setMarcas] = useState<Record<string, MarcaAsistencia>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('todas');
  const [editing, setEditing] = useState<string | null>(null);
  const [editEntrada, setEditEntrada] = useState('');
  const [editSalida, setEditSalida] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [emps, marcasData] = await Promise.all([
      getEmpleados(),
      getMarcasDelDia(date),
    ]);
    setEmpleados(emps.filter(e => e.activo !== false));
    setMarcas(marcasData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [date]);

  const areas = [...new Set(empleados.map(e => e.area).filter(Boolean))].sort();

  useEffect(() => {
    if (areas.length > 0 && selectedAreas.length === 0) {
      setSelectedAreas(areas);
    }
  }, [areas]);

  const filteredEmpleados = empleados.filter(e => {
    const matchSearch = !search || `${e.nombres} ${e.apellidos} ${e.code}`.toLowerCase().includes(search.toLowerCase());
    const matchArea = filterArea === 'todas' || e.area === filterArea;
    return matchSearch && matchArea;
  });

  const handleEdit = (code: string) => {
    const m = marcas[code];
    setEditing(code);
    setEditEntrada(tsToTimeInput(m?.entrada));
    setEditSalida(tsToTimeInput(m?.salida));
  };

  const handleSave = async (code: string) => {
    const entrada = editEntrada ? parseTimeToTs(date, editEntrada) : Date.now();
    const salida = editSalida ? parseTimeToTs(date, editSalida) : undefined;
    await saveMarcaAsistencia(date, code, {
      entrada,
      ...(salida && { salida }),
      tipo: 'normal',
    });
    setEditing(null);
    await loadData();
  };

  const handleAdd = async (code: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setEditing(code);
    setEditEntrada(timeStr);
    setEditSalida('');
  };

  const handleDelete = async (code: string) => {
    await deleteMarcaAsistencia(date, code);
    await loadData();
  };

  const getInitials = (emp: Empleado) => {
    return ((emp.nombres?.charAt(0) || '') + (emp.apellidos?.charAt(0) || '')).toUpperCase();
  };

  // Group employees by area for print
  const empleadosByArea = (areaList: string[]) => {
    return areaList
      .map(area => ({
        area,
        empleados: empleados.filter(e => e.area === area),
      }))
      .filter(g => g.empleados.length > 0);
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  useEffect(() => {
    if (showPrintPreview) {
      const afterPrint = () => setShowPrintPreview(false);
      window.addEventListener('afterprint', afterPrint);
      return () => window.removeEventListener('afterprint', afterPrint);
    }
  }, [showPrintPreview]);

  const formatDateLong = (d: string) => {
    const dateObj = new Date(d + 'T12:00:00');
    return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <>
      {/* Print-only view */}
      {showPrintPreview && (
        <div ref={printRef} className="print-only" style={{ display: 'none' }}>
          <style>{`
            @media print {
              body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 20px; }
              .print-only { display: block !important; }
              .no-print { display: none !important; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; font-size: 11px; }
              th { background: #e5e7eb; font-weight: bold; }
              .area-title { font-size: 16px; font-weight: bold; margin: 20px 0 8px; padding: 6px 10px; background: #f3f4f6; border-left: 4px solid #2563eb; }
              .header { text-align: center; margin-bottom: 20px; }
              .header h1 { font-size: 18px; margin: 0; }
              .header p { font-size: 12px; color: #555; margin: 4px 0 0; }
              .page-break { page-break-before: always; }
            }
          `}</style>
          <div className="header">
            <h1>Reporte de Asistencia</h1>
            <p>{formatDateLong(date)}</p>
          </div>
          {empleadosByArea(selectedAreas).map(group => (
            <div key={group.area} className={group !== empleadosByArea(selectedAreas)[0] ? 'page-break' : ''}>
              <div className="area-title">{group.area}</div>
              <table>
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Nombre Completo</th>
                    <th>Cedula</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {group.empleados.map(emp => {
                    const m = marcas[emp.code];
                    return (
                      <tr key={emp.code}>
                        <td style={{ fontFamily: 'monospace' }}>{emp.code}</td>
                        <td>{emp.nombres} {emp.apellidos}</td>
                        <td>{emp.cedula}</td>
                        <td>{m?.entrada ? formatTime(m.entrada) : '-'}</td>
                        <td>{m?.salida ? formatTime(m.salida) : '-'}</td>
                        <td>
                          {m?.entrada ? (m.salida ? 'Completo' : 'En curso') : 'Sin marca'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Main view */}
      <div className="space-y-6 no-print">
        {/* Header */}
        <Card className="border-primary/20 bg-card/95">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Asistencia por Area
              </CardTitle>
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-44 border-border bg-input"
                />
                <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Area selection for print */}
        <Card className="border-primary/20 bg-card/95">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Users className="h-4 w-4" />
              Areas a incluir en impresion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              {areas.map(area => (
                <label key={area} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedAreas.includes(area)}
                    onCheckedChange={() => toggleArea(area)}
                  />
                  <span className="text-sm text-foreground">{area}</span>
                </label>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelectedAreas(areas)} className="text-xs text-muted-foreground">
                Seleccionar todas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-primary/20 bg-card/95">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar empleado..."
                  className="w-full border-border bg-input pl-9"
                />
              </div>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-44 border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="todas">Todas las areas</SelectItem>
                    {areas.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Cargando...</div>
            ) : filteredEmpleados.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p>No hay empleados en esta area</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-left font-medium text-muted-foreground">Empleado</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Area</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Entrada</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Salida</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Estado</th>
                      <th className="p-3 text-right font-medium text-muted-foreground">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmpleados.map(emp => {
                      const m = marcas[emp.code];
                      const isEditing = editing === emp.code;

                      return (
                        <tr key={emp.code} className="border-b border-border hover:bg-muted/20">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-primary/30">
                                <AvatarImage src={emp.foto} alt={`${emp.nombres} ${emp.apellidos}`} />
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {getInitials(emp)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{emp.nombres} {emp.apellidos}</p>
                                <p className="text-xs text-muted-foreground font-mono">{emp.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{emp.area}</td>
                          <td className="p-3">
                            {isEditing ? (
                              <Input
                                type="time"
                                value={editEntrada}
                                onChange={(e) => setEditEntrada(e.target.value)}
                                className="w-28 border-border bg-input"
                              />
                            ) : (
                              <span className={m?.entrada ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
                                {m?.entrada ? formatTime(m.entrada) : '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <Input
                                type="time"
                                value={editSalida}
                                onChange={(e) => setEditSalida(e.target.value)}
                                className="w-28 border-border bg-input"
                              />
                            ) : (
                              <span className={m?.salida ? 'text-blue-500 font-medium' : 'text-muted-foreground'}>
                                {m?.salida ? formatTime(m.salida) : '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {m?.entrada ? (
                              m.salida ? (
                                <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-500">Completo</span>
                              ) : (
                                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">En curso</span>
                              )
                            ) : (
                              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Sin marca</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleSave(emp.code)} className="text-green-500">
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="text-muted-foreground">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {m?.entrada ? (
                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(emp.code)} className="text-primary">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={() => handleAdd(emp.code)} className="text-green-500" title="Agregar marca manual">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                                {m?.entrada && (
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(emp.code)} className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
