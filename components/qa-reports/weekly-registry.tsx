'use client';

import { useState, useEffect } from 'react';
import { Database, Trash2, ChevronDown, ChevronRight, CalendarDays, Edit, Save, Scissors, Search, X, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { get, ref, db, remove, update, push, set } from '@/lib/firebase';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function MiniCalendar({ startDate, endDate, onChange }: { startDate: string; endDate: string; onChange: (s: string, e: string) => void }) {
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const today = toLocalDateStr(new Date());

  const cellClass = (d: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;
    const inRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
    return `w-9 h-9 text-xs rounded-full flex items-center justify-center cursor-pointer transition-all
      ${isStart || isEnd ? 'bg-primary text-primary-foreground font-bold scale-110 shadow-md' : ''}
      ${inRange && !isStart && !isEnd ? 'bg-primary/20 text-foreground' : ''}
      ${!inRange && !isStart && !isEnd ? 'hover:bg-muted/30 text-muted-foreground' : ''}
      ${dateStr === today && !isStart && !isEnd ? 'ring-1 ring-primary/50' : ''}`;
  };

  const handleDayClick = (d: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (selecting === 'start' || !startDate) {
      onChange(dateStr, '');
      setSelecting('end');
    } else {
      if (dateStr < startDate) { onChange(dateStr, startDate); }
      else { onChange(startDate, dateStr); }
      setSelecting('start');
    }
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`e${i}`} className="w-9 h-9" />);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(<div key={d} className={cellClass(d)} onClick={() => handleDayClick(d)}>{d}</div>);
  }

  return (
    <div className="inline-flex flex-col items-center rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-center justify-between w-full mb-3">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); } else setViewMonth(v => v - 1); }} className="p-1 rounded hover:bg-muted/30 text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-foreground">{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); } else setViewMonth(v => v + 1); }} className="p-1 rounded hover:bg-muted/30 text-muted-foreground"><ChevronRightIcon className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(d => <div key={d} className="w-9 h-7 text-xs text-center text-muted-foreground font-medium flex items-center justify-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border w-full text-xs text-muted-foreground">
        <span className={`flex items-center gap-1 ${selecting === 'start' ? 'text-primary font-semibold' : ''}`}>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" /> Inicio: {startDate || '—'}
        </span>
        <span className={`flex items-center gap-1 ${selecting === 'end' ? 'text-primary font-semibold' : ''}`}>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary/50" /> Fin: {endDate || '—'}
        </span>
      </div>
    </div>
  );
}

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
}

export function WeeklyRegistry() {
  const [records, setRecords] = useState<WeeklyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Filter
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, 'qa-reports/weekly-registry'));
      const data = snapshot.val() || {};
      const list: WeeklyRecord[] = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setRecords(list);
    } catch { setRecords([]); }
    setLoading(false);
  };

  const filteredRecords = filterStart && filterEnd
    ? records.filter(r => r.startDate >= filterStart && r.endDate <= filterEnd)
    : records;

  // Group by year → month
  const groupedByYear: Record<number, { month: number; records: WeeklyRecord[] }[]> = {};
  filteredRecords.forEach(r => {
    const y = parseInt(r.startDate.slice(0, 4));
    const m = parseInt(r.startDate.slice(5, 7));
    if (!groupedByYear[y]) groupedByYear[y] = [];
    let monthGroup = groupedByYear[y].find(g => g.month === m);
    if (!monthGroup) {
      monthGroup = { month: m, records: [] };
      groupedByYear[y].push(monthGroup);
    }
    monthGroup.records.push(r);
  });

  // Sort years desc, months desc
  const sortedYears = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);
  sortedYears.forEach(y => {
    groupedByYear[y].sort((a, b) => b.month - a.month);
    groupedByYear[y].forEach(mg => {
      mg.records.sort((a, b) => b.startDate.localeCompare(a.startDate));
    });
  });

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro definitivamente?')) return;
    try { await remove(ref(db, `qa-reports/weekly-registry/${id}`)); await loadRecords(); }
    catch { alert('Error al eliminar'); }
  };

  const startEditDates = (record: WeeklyRecord) => {
    setEditingDateId(record.id);
    setEditStart(record.startDate);
    setEditEnd(record.endDate);
  };

  const saveDates = async (id: string) => {
    try {
      await update(ref(db, `qa-reports/weekly-registry/${id}`), { startDate: editStart, endDate: editEnd });
      setEditingDateId(null);
      await loadRecords();
    } catch { alert('Error al guardar las fechas'); }
  };

  const cancelEditDates = () => setEditingDateId(null);

  const spansTwoMonths = (r: WeeklyRecord): boolean => {
    const s = r.startDate?.slice(5, 7);
    const e = r.endDate?.slice(5, 7);
    return s && e && s !== e;
  };

  const handleSplit = async (record: WeeklyRecord) => {
    if (!confirm(`Esta semana (${record.startDate} al ${record.endDate}) cruza dos meses. Se crearán dos registros separados. ¿Continuar?`)) return;
    try {
      const sy = parseInt(record.startDate.slice(0, 4)), sm = parseInt(record.startDate.slice(5, 7));
      const ey = parseInt(record.endDate.slice(0, 4)), em = parseInt(record.endDate.slice(5, 7));
      const ld = new Date(sy, sm, 0).getDate();
      const r1End = `${String(sy).padStart(4, '0')}-${String(sm).padStart(2, '0')}-${String(ld).padStart(2, '0')}`;
      const r2Start = `${String(ey).padStart(4, '0')}-${String(em).padStart(2, '0')}-01`;
      const common = { weekNumber: record.weekNumber, factories: record.factories, totals: record.totals, createdAt: Date.now() };
      await set(push(ref(db, 'qa-reports/weekly-registry')), { ...common, year: sy, month: sm, startDate: record.startDate, endDate: r1End, label: `Semana ${record.weekNumber} - ${sy} (parte ${sm})` });
      await set(push(ref(db, 'qa-reports/weekly-registry')), { ...common, year: ey, month: em, startDate: r2Start, endDate: record.endDate, label: `Semana ${record.weekNumber} - ${ey} (parte ${em})` });
      alert(`Registro dividido:\n- ${record.startDate} al ${r1End}\n- ${r2Start} al ${record.endDate}\n\nAjusta los valores manualmente.`);
      await loadRecords();
    } catch { alert('Error al dividir'); }
  };

  const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const clearFilter = () => { setFilterStart(''); setFilterEnd(''); };

  return (
    <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              Registro de Weekly Issues
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {filterStart && filterEnd
                ? `Filtrando: ${filterStart} al ${filterEnd} · ${filteredRecords.length} registro(s)`
                : `${records.length} registro(s) — organizado por año y mes`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)} className="border-border">
              <Search className="mr-1 h-4 w-4" />
              {showFilter ? 'Cerrar filtro' : 'Filtrar por fecha'}
            </Button>
            <Button variant="outline" size="sm" onClick={loadRecords} className="border-border">Actualizar</Button>
          </div>
        </div>

        {showFilter && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary" /> Inicio: {filterStart || '—'}</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary/50" /> Fin: {filterEnd || '—'}</span>
              {(filterStart || filterEnd) && (
                <Button size="sm" variant="ghost" onClick={clearFilter} className="h-6 text-xs text-destructive">
                  <X className="h-3 w-3 mr-1" /> Limpiar
                </Button>
              )}
            </div>
            <MiniCalendar
              startDate={filterStart}
              endDate={filterEnd}
              onChange={(s, e) => { setFilterStart(s); setFilterEnd(e); }}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Database className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>{filterStart ? 'No hay registros en ese rango de fechas' : 'No hay registros semanales guardados'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedYears.map(year => (
              <div key={year} className="space-y-4">
                {/* Year header */}
                <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">{year}</h3>
                  <span className="text-xs text-muted-foreground">
                    {groupedByYear[year].reduce((s, g) => s + g.records.length, 0)} registro(s)
                  </span>
                </div>

                {/* Months */}
                {groupedByYear[year].map(monthGroup => {
                  const monthKey = `${year}-${monthGroup.month}`;
                  return (
                    <div key={monthKey} className="ml-4 space-y-2">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-primary/80 border-l-2 border-primary/40 pl-3">
                        {MONTHS[monthGroup.month - 1]}
                        <span className="text-xs text-muted-foreground font-normal">{monthGroup.records.length} semana(s)</span>
                      </h4>

                      <div className="ml-4 space-y-2">
                        {monthGroup.records.map(record => (
                          <div key={record.id} className="rounded-lg border border-border bg-muted/10 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                              onClick={() => toggleExpand(record.id)}
                            >
                              <div className="flex items-center gap-3">
                                {expanded[record.id] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                <CalendarDays className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">Semana {record.weekNumber}</span>
                                {editingDateId === record.id ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="h-7 w-36 text-xs" onClick={e => e.stopPropagation()} />
                                    <span className="text-xs text-muted-foreground">al</span>
                                    <Input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="h-7 w-36 text-xs" onClick={e => e.stopPropagation()} />
                                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); saveDates(record.id); }} className="h-7 text-green-500 hover:text-green-400"><Save className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); cancelEditDates(); }} className="h-7 text-muted-foreground">Cancelar</Button>
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {record.startDate} al {record.endDate}
                                    {spansTwoMonths(record) && <span className="ml-2 rounded bg-amber-900/30 px-1.5 py-0.5 text-amber-400 text-xs font-medium">⚠ Cruza meses</span>}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{record.factories?.length || 0} fábricas</span>
                                {spansTwoMonths(record) && editingDateId !== record.id && (
                                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handleSplit(record); }} className="text-amber-500 hover:text-amber-400 h-7 px-2 text-xs">
                                    <Scissors className="h-3 w-3 mr-1" /> Dividir
                                  </Button>
                                )}
                                {editingDateId !== record.id && (
                                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); startEditDates(record); }} className="text-primary hover:text-primary h-7 w-7 p-0"><Edit className="h-4 w-4" /></Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(record.id); }} className="text-destructive hover:text-destructive h-7 w-7 p-0"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>

                            {expanded[record.id] && (
                              <div className="border-t border-border px-4 py-3">
                                <div className="overflow-x-auto max-h-80 overflow-y-auto rounded border border-border">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-800">
                                        <th className="border-b border-r border-border px-2 py-1.5 text-left text-white sticky top-0 bg-slate-800 z-10">Factory Buyer</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-left text-white sticky top-0 bg-slate-800 z-10">Buyer</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-green-300 sticky top-0 bg-slate-800 z-10">No. Audit</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-green-300 sticky top-0 bg-slate-800 z-10">No. Failure</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-muted-foreground sticky top-0 bg-slate-800 z-10">Fail Rate %</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-muted-foreground sticky top-0 bg-slate-800 z-10">Meas Qty</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-muted-foreground sticky top-0 bg-slate-800 z-10">Meas Def</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-green-300 sticky top-0 bg-slate-800 z-10">Meas Rate %</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-muted-foreground sticky top-0 bg-slate-800 z-10">Vis Qty</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-muted-foreground sticky top-0 bg-slate-800 z-10">Vis Def</th>
                                        <th className="border-b border-border px-2 py-1.5 text-center text-green-300 sticky top-0 bg-slate-800 z-10">Vis Rate %</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {record.factories?.map((f, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-muted/10">
                                          <td className="border-r border-border/50 px-2 py-1.5 font-medium text-left">{f.factoryBuyer}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 text-left">{f.buyer}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-green-950/30">{f.totalAudit}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-green-950/30">{f.totalFail}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.totalRate}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.measQty}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.measDef}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-green-950/30">{f.measRate}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.visQty}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.visDef}</td>
                                          <td className="px-2 py-1.5 bg-green-950/30">{f.visRate}</td>
                                        </tr>
                                      ))}
                                      {record.totals && (
                                        <tr className="border-t-2 border-primary/50 bg-primary/5 font-bold">
                                          <td className="border-r border-border/50 px-2 py-2 text-left text-primary">{record.totals.factoryBuyer}</td>
                                          <td className="border-r border-border/50 px-2 py-2 text-left">{record.totals.buyer}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-green-950/40">{record.totals.totalAudit}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-green-950/40">{record.totals.totalFail}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.totalRate}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.measQty}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.measDef}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-green-950/40">{record.totals.measRate}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.visQty}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.visDef}</td>
                                          <td className="px-2 py-2 bg-green-950/40">{record.totals.visRate}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
