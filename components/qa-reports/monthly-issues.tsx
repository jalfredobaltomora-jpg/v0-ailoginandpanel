'use client';

import { useState, useEffect } from 'react';
import { CalendarRange, ChevronDown, ChevronRight, BarChart3, Edit, ClipboardCopy, Sparkles, RotateCcw, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onValue, ref, db } from '@/lib/firebase';

interface FactoryRow {
  factoryBuyer: string;
  buyer: string;
  totalAudit: number;
  totalFail: number;
  totalRate: string;
  measQty: number;
  measDef: number;
  measRate: string;
  visQty: number;
  visDef: number;
  visRate: string;
}

interface WeeklyRecord {
  id: string;
  weekNumber: number;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  label: string;
  createdAt: number;
  factories: FactoryRow[];
  totals: FactoryRow;
  _weight?: number;
}

interface MonthGroup {
  year: number;
  month: number;
  label: string;
  monthStart: string;
  monthEnd: string;
  weeks: WeeklyRecord[];
  factories: FactoryRow[];
  totals: FactoryRow;
}

function calcularPorcentaje(dividendo: number, divisor: number): string {
  if (divisor === 0) return '0.00%';
  return ((dividendo / divisor) * 100).toFixed(2) + '%';
}

function parseNum(valor: unknown): number {
  if (valor === undefined || valor === null || valor === '') return 0;
  const num = Number(String(valor).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function MonthlyIssues() {
  const [groups, setGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editData, setEditData] = useState<FactoryRow[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'qa-reports/weekly-registry'), (snapshot) => {
      const data = snapshot.val() || {};
      const records: WeeklyRecord[] = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));

      const getMonthFromDate = (dateStr: string): number => parseInt(dateStr.slice(5, 7));
      const getYearFromDate = (dateStr: string): number => parseInt(dateStr.slice(0, 4));

      const grouped: Record<string, WeeklyRecord[]> = {};
      records.forEach(r => {
        const split = (r as any)._monthSplit;
        if (split && split.length > 1) {
          split.forEach((ms: { year: number; month: number; days: number; factor: number }) => {
            const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push({ ...r, _weight: ms.factor });
          });
        } else {
          const m = getMonthFromDate(r.startDate);
          const y = getYearFromDate(r.startDate);
          const key = `${y}-${String(m).padStart(2, '0')}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(r);
        }
      });

      const result: MonthGroup[] = Object.entries(grouped)
        .map(([key, weeks]) => {
          weeks.sort((a, b) => a.weekNumber - b.weekNumber);
          const [yearStr, monthStr] = key.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr);
          const monthDate = new Date(year, month - 1, 1);
          const monthEndDate = new Date(year, month, 0);
          const fmt = (d: Date) => {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}/${mm}/${d.getFullYear()}`;
          };
          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const round = (n: number) => Math.round(n);
          const factoryMap: Record<string, FactoryRow> = {};
          weeks.forEach(week => {
            const w = (week as any)._weight || 1;
            (week.factories || []).forEach(f => {
              if (!factoryMap[f.factoryBuyer]) {
                factoryMap[f.factoryBuyer] = {
                  ...f,
                  totalAudit: round(f.totalAudit * w),
                  totalFail: round(f.totalFail * w),
                  measQty: round(f.measQty * w),
                  measDef: round(f.measDef * w),
                  visQty: round(f.visQty * w),
                  visDef: round(f.visDef * w),
                };
              } else {
                factoryMap[f.factoryBuyer].totalAudit += round(f.totalAudit * w);
                factoryMap[f.factoryBuyer].totalFail += round(f.totalFail * w);
                factoryMap[f.factoryBuyer].measQty += round(f.measQty * w);
                factoryMap[f.factoryBuyer].measDef += round(f.measDef * w);
                factoryMap[f.factoryBuyer].visQty += round(f.visQty * w);
                factoryMap[f.factoryBuyer].visDef += round(f.visDef * w);
              }
            });
          });
          const factories = Object.entries(factoryMap).map(([name, f]) => ({
            ...f,
            factoryBuyer: name,
            totalRate: calcularPorcentaje(f.totalFail, f.totalAudit),
            measRate: calcularPorcentaje(f.measDef, f.measQty),
            visRate: calcularPorcentaje(f.visDef, f.visQty),
          }));
          const totAudit = factories.reduce((s, f) => s + f.totalAudit, 0);
          const totFail = factories.reduce((s, f) => s + f.totalFail, 0);
          const totMQty = factories.reduce((s, f) => s + f.measQty, 0);
          const totMDef = factories.reduce((s, f) => s + f.measDef, 0);
          const totVQty = factories.reduce((s, f) => s + f.visQty, 0);
          const totVDef = factories.reduce((s, f) => s + f.visDef, 0);
          return {
            year, month,
            label: `${months[month - 1]} ${year}`,
            monthStart: fmt(monthDate), monthEnd: fmt(monthEndDate),
            weeks, factories,
            totals: {
              factoryBuyer: 'Total General', buyer: '',
              totalAudit: totAudit, totalFail: totFail, totalRate: calcularPorcentaje(totFail, totAudit),
              measQty: totMQty, measDef: totMDef, measRate: calcularPorcentaje(totMDef, totMQty),
              visQty: totVQty, visDef: totVDef, visRate: calcularPorcentaje(totVDef, totVQty),
            },
          };
        })
        .sort((a, b) => a.year - b.year || a.month - b.month);

      setGroups(result);
      const expandedMap: Record<string, boolean> = {};
      result.forEach(g => { expandedMap[`${g.year}-${g.month}`] = true; });
      setExpanded(expandedMap);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    if (editKey === key) setEditKey(null);
  };

  const startEdit = (key: string, factories: FactoryRow[]) => {
    setEditKey(key);
    setEditData(factories.map(f => ({ ...f })));
    setStatusMsg('✏️ Modo edición activado');
  };

  const handleCellChange = (index: number, field: keyof FactoryRow, value: string) => {
    const updated = [...editData];
    (updated[index] as any)[field] = parseNum(value);
    setEditData(updated);
  };

  const recalcFromWeekly = (key: string) => {
    const group = groups.find(g => `${g.year}-${g.month}` === key);
    if (group) {
      setEditData(group.factories.map(f => ({ ...f })));
      setStatusMsg('🔄 Datos recalculados desde registros semanales');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const saveEdits = (key: string) => {
    const group = groups.find(g => `${g.year}-${g.month}` === key);
    if (!group) return;
    const data = editData;
    let sAudit = 0, sFail = 0, sMQty = 0, sMDef = 0, sVQty = 0, sVDef = 0;
    data.forEach(f => {
      f.totalRate = calcularPorcentaje(f.totalFail, f.totalAudit);
      f.measRate = calcularPorcentaje(f.measDef, f.measQty);
      f.visRate = calcularPorcentaje(f.visDef, f.visQty);
      sAudit += f.totalAudit; sFail += f.totalFail;
      sMQty += f.measQty; sMDef += f.measDef;
      sVQty += f.visQty; sVDef += f.visDef;
    });
    const updatedGroups = groups.map(g => {
      if (`${g.year}-${g.month}` === key) {
        return {
          ...g,
          factories: data,
          totals: {
            factoryBuyer: 'Total General', buyer: '',
            totalAudit: sAudit, totalFail: sFail, totalRate: calcularPorcentaje(sFail, sAudit),
            measQty: sMQty, measDef: sMDef, measRate: calcularPorcentaje(sMDef, sMQty),
            visQty: sVQty, visDef: sVDef, visRate: calcularPorcentaje(sVDef, sVQty),
          },
        };
      }
      return g;
    });
    setGroups(updatedGroups);
    setEditKey(null);
    setStatusMsg('✅ Datos actualizados localmente');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const copyMonthly = async (group: MonthGroup, key: string) => {
    const data = editKey === key ? editData : group.factories;
    const lines = ['Fábrica / Comprador\tNo. Auditoría\tNo. Fallos\tTasa de Fallo %\tCant. Med.\tDef. Med.\tTasa Med. %\tCant. Vis.\tDef. Vis.\tTasa Vis. %'];
    data.forEach(f => {
      lines.push(`${f.factoryBuyer}\t${f.totalAudit}\t${f.totalFail}\t${f.totalRate}\t${f.measQty}\t${f.measDef}\t${f.measRate}\t${f.visQty}\t${f.visDef}\t${f.visRate}`);
    });
    const t = group.totals;
    lines.push(`\n${t.factoryBuyer}\t${t.totalAudit}\t${t.totalFail}\t${t.totalRate}\t${t.measQty}\t${t.measDef}\t${t.measRate}\t${t.visQty}\t${t.visDef}\t${t.visRate}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatusMsg(`✅ Datos de ${group.label} copiados al portapapeles`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch {
      alert('Error al copiar');
    }
  };

  const renderCell = (f: FactoryRow, field: keyof FactoryRow, index: number, isEditing: boolean) => {
    if (isEditing && (field === 'totalAudit' || field === 'totalFail' || field === 'measQty' || field === 'measDef' || field === 'visQty' || field === 'visDef')) {
      return (
        <input
          type="text"
          value={f[field] as number}
          onChange={(e) => handleCellChange(index, field, e.target.value)}
          className="w-[65px] rounded border-2 border-amber-500 bg-amber-900/20 px-1.5 py-1 text-center text-xs font-bold text-foreground"
        />
      );
    }
    return <span>{String(f[field] ?? '')}</span>;
  };

  const rowClass = (isEditing: boolean) =>
    isEditing ? 'border-b border-border/50 hover:bg-muted/10' : 'border-b border-border/50';

  // Filter options
  const availableYears = [...new Set(groups.map(g => g.year))].sort((a, b) => b - a);
  const availableMonths = filterYear !== 'all'
    ? groups.filter(g => g.year === Number(filterYear)).map(g => g.month)
    : groups.map(g => g.month);
  const uniqueMonths = [...new Set(availableMonths)].sort((a, b) => a - b);

  const filteredGroups = groups.filter(g => {
    if (filterYear !== 'all' && g.year !== Number(filterYear)) return false;
    if (filterMonth !== 'all' && g.month !== Number(filterMonth)) return false;
    return true;
  });

  const handleFilterChange = (type: 'year' | 'month', value: string) => {
    if (type === 'year') { setFilterYear(value); setFilterMonth('all'); }
    else setFilterMonth(value);
    setEditKey(null);
  };

  return (
    <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CalendarRange className="h-5 w-5" />
              Incidencias Mensuales
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Total acumulado del mes — edición y copia al portapapeles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterYear} onValueChange={(v) => handleFilterChange('year', v)}>
                <SelectTrigger className="w-28 h-8 text-xs border-border bg-input">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all" className="text-xs">Todos los años</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={(v) => handleFilterChange('month', v)}>
                <SelectTrigger className="w-36 h-8 text-xs border-border bg-input">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all" className="text-xs">Todos los meses</SelectItem>
                    {uniqueMonths.map(m => (
                      <SelectItem key={m} value={String(m)} className="text-xs">
                        {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m - 1]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">Tiempo real</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {statusMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            {statusMsg.startsWith('✅') ? (
              <ClipboardCopy className="h-4 w-4 text-green-500 shrink-0" />
            ) : statusMsg.startsWith('✏️') ? (
              <Edit className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
            )}
            <span>{statusMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CalendarRange className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No hay datos mensuales disponibles</p>
            <p className="text-xs mt-1">Guarda reportes semanales en Weekly Issues</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.length === 0 && (filterYear !== 'all' || filterMonth !== 'all') ? (
              <div className="py-8 text-center text-muted-foreground">
                <CalendarRange className="mx-auto mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm">No hay datos para el período seleccionado</p>
                <p className="text-xs mt-1">Cambia el filtro o guarda registros semanales</p>
              </div>
            ) : filteredGroups.map((group) => {
              const key = `${group.year}-${group.month}`;
              const isEditing = editKey === key;
              const data = isEditing ? editData : group.factories;
              const total = isEditing
                ? {
                    factoryBuyer: 'Total General', buyer: '',
                    totalAudit: editData.reduce((s, f) => s + f.totalAudit, 0),
                    totalFail: editData.reduce((s, f) => s + f.totalFail, 0),
                    totalRate: '',
                    measQty: editData.reduce((s, f) => s + f.measQty, 0),
                    measDef: editData.reduce((s, f) => s + f.measDef, 0),
                    measRate: '',
                    visQty: editData.reduce((s, f) => s + f.visQty, 0),
                    visDef: editData.reduce((s, f) => s + f.visDef, 0),
                    visRate: '',
                  }
                : group.totals;
              if (isEditing) {
                (total as any).totalRate = calcularPorcentaje(total.totalFail, total.totalAudit);
                (total as any).measRate = calcularPorcentaje(total.measDef, total.measQty);
                (total as any).visRate = calcularPorcentaje(total.visDef, total.visQty);
              }

              return (
                <div key={key} className="rounded-lg border border-border bg-muted/10 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => toggleExpand(key)}
                  >
                    <div className="flex items-center gap-3">
                      {expanded[key] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-medium text-foreground">{group.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{group.monthStart} al {group.monthEnd}</span>
                        <span className="ml-3 text-xs text-muted-foreground">{group.factories.length} fábricas · {group.weeks.length} semanas</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {group.weeks.map((w, wi) => <span key={`${w.id}-${wi}`} className="rounded bg-muted/30 px-2 py-0.5">S{w.weekNumber}</span>)}
                    </div>
                  </div>

                  {expanded[key] && (
                    <div className="border-t border-border px-4 py-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {!isEditing ? (
                          <>
                            <Button size="sm" onClick={() => startEdit(key, group.factories)} className="bg-amber-600 text-white hover:bg-amber-700">
                              <Edit className="mr-1 h-4 w-4" /> Editar
                            </Button>
                            <Button size="sm" onClick={() => copyMonthly(group, key)} className="bg-green-600 text-white hover:bg-green-700">
                              <ClipboardCopy className="mr-1 h-4 w-4" /> Copiar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => saveEdits(key)} className="bg-purple-600 text-white hover:bg-purple-700">
                              <Sparkles className="mr-1 h-4 w-4" /> Calcular y Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => recalcFromWeekly(key)} className="border-border">
                              <RotateCcw className="mr-1 h-4 w-4" /> Restaurar
                            </Button>
                          </>
                        )}
                      </div>

                      <div className="overflow-x-auto max-h-96 overflow-y-auto rounded border border-primary/30">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-800">
                              <th rowSpan={2} className="border-b border-r border-border px-2 py-1.5 text-left text-white sticky top-0 bg-slate-800 z-10">Fábrica / Comprador</th>
                              <th colSpan={3} className="border-b border-r border-border px-2 py-1.5 text-center font-semibold text-white sticky top-0 bg-slate-800 z-10">
                                TOTAL
                              </th>
                              <th colSpan={3} className="border-b border-r border-border px-2 py-1.5 text-center font-semibold text-white sticky top-0 bg-slate-800 z-10">
                                MEDICIÓN
                              </th>
                              <th colSpan={3} className="border-b border-border px-2 py-1.5 text-center font-semibold text-white sticky top-0 bg-slate-800 z-10">
                                VISUAL
                              </th>
                            </tr>
                            <tr className="bg-slate-700">
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-cyan-300 sticky top-[33px] bg-slate-700 z-10">No. Auditoría</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-cyan-300 sticky top-[33px] bg-slate-700 z-10">No. Fallos</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-muted-foreground sticky top-[33px] bg-slate-700 z-10">Tasa de Fallo %</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-amber-300 sticky top-[33px] bg-slate-700 z-10">Cant. Insp.</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-amber-300 sticky top-[33px] bg-slate-700 z-10">Cant. Def.</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-amber-300 sticky top-[33px] bg-slate-700 z-10">Tasa de Defecto %</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-violet-300 sticky top-[33px] bg-slate-700 z-10">Cant. Insp.</th>
                              <th className="border-b border-r border-border px-2 py-1 text-center text-xs text-violet-300 sticky top-[33px] bg-slate-700 z-10">Cant. Def.</th>
                              <th className="border-b border-border px-2 py-1 text-center text-xs text-violet-300 sticky top-[33px] bg-slate-700 z-10">Tasa de Defecto %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((f, i) => (
                              <tr key={i} className={rowClass(isEditing)}>
                                <td className="border-r border-border/50 px-2 py-1.5 font-medium text-left">{f.factoryBuyer}</td>
                                <td className="border-r border-border/50 px-2 py-1.5 bg-cyan-950/30 font-medium">{renderCell(f, 'totalAudit', i, isEditing)}</td>
                                <td className="border-r border-border/50 px-2 py-1.5 bg-cyan-950/30 font-medium">{renderCell(f, 'totalFail', i, isEditing)}</td>
                                <td className="border-r border-border/50 px-2 py-1.5">{f.totalRate}</td>
                                <td className="border-r border-border/50 px-2 py-1.5">{renderCell(f, 'measQty', i, isEditing)}</td>
                                <td className="border-r border-border/50 px-2 py-1.5">{renderCell(f, 'measDef', i, isEditing)}</td>
                                <td className="border-r border-border/50 px-2 py-1.5 bg-amber-950/30 font-medium">{f.measRate}</td>
                                <td className="border-r border-border/50 px-2 py-1.5">{renderCell(f, 'visQty', i, isEditing)}</td>
                                <td className="border-r border-border/50 px-2 py-1.5">{renderCell(f, 'visDef', i, isEditing)}</td>
                                <td className="px-2 py-1.5 bg-violet-950/30 font-medium">{f.visRate}</td>
                              </tr>
                            ))}
                            {total && (
                              <tr className="border-t-2 border-primary/50 bg-primary/10 font-bold">
                                <td className="border-r border-border/50 px-2 py-2 text-left text-primary">{total.factoryBuyer}</td>
                                <td className="border-r border-border/50 px-2 py-2 bg-cyan-950/40">{total.totalAudit}</td>
                                <td className="border-r border-border/50 px-2 py-2 bg-cyan-950/40">{total.totalFail}</td>
                                <td className="border-r border-border/50 px-2 py-2">{total.totalRate}</td>
                                <td className="border-r border-border/50 px-2 py-2">{total.measQty}</td>
                                <td className="border-r border-border/50 px-2 py-2">{total.measDef}</td>
                                <td className="border-r border-border/50 px-2 py-2 bg-amber-950/40">{total.measRate}</td>
                                <td className="border-r border-border/50 px-2 py-2">{total.visQty}</td>
                                <td className="border-r border-border/50 px-2 py-2">{total.visDef}</td>
                                <td className="px-2 py-2 bg-violet-950/40">{total.visRate}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
