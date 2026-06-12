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

function calcularPorcentaje(dividendo: number, divisor: number): string {
  if (divisor === 0) return '0.00%';
  return ((dividendo / divisor) * 100).toFixed(2) + '%';
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
  _monthSplit?: { year: number; month: number; days: number; factor: number }[];
}

function getMonthSplit(startDate: string, endDate: string): { year: number; month: number; days: number; factor: number }[] {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const result: { year: number; month: number; days: number; factor: number }[] = [];
  let d = new Date(start);
  while (d <= end) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    let days = 0;
    while (d <= end && d.getMonth() + 1 === month) {
      days++;
      d.setDate(d.getDate() + 1);
    }
    result.push({ year, month, days, factor: days / totalDays });
  }
  return result;
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

  // Split modal
  const [splitRecord, setSplitRecord] = useState<WeeklyRecord | null>(null);
  const [splitEditData, setSplitEditData] = useState<Record<string, FactoryRow[]>>({});

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, 'qa-reports/weekly-registry'));
      const data = snapshot.val() || {};
      const list: WeeklyRecord[] = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
      list.sort((a, b) => a.year - b.year || a.weekNumber - b.weekNumber);
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

  // Sort years asc, months asc, weeks asc
  const sortedYears = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b);
  sortedYears.forEach(y => {
    groupedByYear[y].sort((a, b) => a.month - b.month);
    groupedByYear[y].forEach(mg => {
      mg.records.sort((a, b) => a.weekNumber - b.weekNumber);
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
    return !!(s && e && s !== e);
  };

  const openSplitModal = (record: WeeklyRecord) => {
    const monthSplit = getMonthSplit(record.startDate, record.endDate);
    const edit: Record<string, FactoryRow[]> = {};
    monthSplit.forEach(ms => {
      const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
      edit[key] = record.factories.map(f => ({ ...f }));
    });
    setSplitEditData(edit);
    setSplitRecord(record);
  };

  const handleSplitCellChange = (monthKey: string, index: number, field: keyof FactoryRow, value: string) => {
    setSplitEditData(prev => {
      const updated = { ...prev };
      if (updated[monthKey]) {
        const rows = [...updated[monthKey]];
        rows[index] = { ...rows[index], [field]: parseNum(value) as any };
        updated[monthKey] = rows;
      }
      return updated;
    });
  };

  const saveSplit = async () => {
    if (!splitRecord) return;
    try {
      const monthSplit = getMonthSplit(splitRecord.startDate, splitRecord.endDate);
      const origStart = new Date(splitRecord.startDate + 'T12:00:00');
      const origEnd = new Date(splitRecord.endDate + 'T12:00:00');
      for (const ms of monthSplit) {
        const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
        const monthData = splitEditData[key];
        if (!monthData) continue;
        // Use the overlapping portion of the original dates, not the full month
        const mStart = new Date(ms.year, ms.month - 1, 1);
        const mEnd = new Date(ms.year, ms.month, 0);
        const sDate = origStart > mStart ? origStart : mStart;
        const eDate = origEnd < mEnd ? origEnd : mEnd;
        const s = toLocalDateStr(sDate);
        const e = toLocalDateStr(eDate);
        // Use original week number (both parts belong to same business week)
        const weekNumber = splitRecord.weekNumber;
        // Calculate rates for each factory row
        const monthDataWithRates = monthData.map(f => ({
          ...f,
          totalRate: calcularPorcentaje(f.totalFail, f.totalAudit),
          measRate: calcularPorcentaje(f.measDef, f.measQty),
          visRate: calcularPorcentaje(f.visDef, f.visQty),
        }));
        const totalsMonth: FactoryRow = {
          factoryBuyer: 'Total General', buyer: '',
          totalAudit: monthDataWithRates.reduce((s, f) => s + f.totalAudit, 0),
          totalFail: monthDataWithRates.reduce((s, f) => s + f.totalFail, 0),
          totalRate: '',
          measQty: monthDataWithRates.reduce((s, f) => s + f.measQty, 0),
          measDef: monthDataWithRates.reduce((s, f) => s + f.measDef, 0),
          measRate: '',
          visQty: monthDataWithRates.reduce((s, f) => s + f.visQty, 0),
          visDef: monthDataWithRates.reduce((s, f) => s + f.visDef, 0),
          visRate: '',
        };
        totalsMonth.totalRate = calcularPorcentaje(totalsMonth.totalFail, totalsMonth.totalAudit);
        totalsMonth.measRate = calcularPorcentaje(totalsMonth.measDef, totalsMonth.measQty);
        totalsMonth.visRate = calcularPorcentaje(totalsMonth.visDef, totalsMonth.visQty);
        const record: any = {
          weekNumber,
          year: ms.year,
          month: ms.month,
          startDate: s,
          endDate: e,
          label: `${MONTHS[ms.month - 1]} ${ms.year}`,
          createdAt: Date.now(),
          factories: monthDataWithRates,
          totals: totalsMonth,
          _splitFrom: splitRecord.id,
        };
        const newRef = push(ref(db, 'qa-reports/weekly-registry'));
        await set(newRef, record);
      }
      await remove(ref(db, `qa-reports/weekly-registry/${splitRecord.id}`));
      setSplitRecord(null);
      setSplitEditData({});
      await loadRecords();
    } catch (e) {
      alert('Error al dividir: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    }
  };

  const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const clearFilter = () => { setFilterStart(''); setFilterEnd(''); };

  function parseNum(valor: unknown): number {
    if (valor === undefined || valor === null || valor === '') return 0;
    const num = Number(String(valor).replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  return (
    <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              Registro
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Historial semanal
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
                                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openSplitModal(record); }} className="text-amber-500 hover:text-amber-400 h-7 px-2 text-xs">
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
                                        <th className="border-b border-r border-border px-2 py-1.5 text-left text-white sticky top-0 bg-slate-800 z-10">Fábrica / Comprador</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-cyan-300 sticky top-0 bg-slate-800 z-10">No. Auditoría</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-cyan-300 sticky top-0 bg-slate-800 z-10">No. Fallos</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-muted-foreground sticky top-0 bg-slate-800 z-10">Tasa de Fallo %</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-amber-300 sticky top-0 bg-slate-800 z-10">Cant. Med.</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-amber-300 sticky top-0 bg-slate-800 z-10">Def. Med.</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-amber-300 sticky top-0 bg-slate-800 z-10">Tasa Med. %</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-violet-300 sticky top-0 bg-slate-800 z-10">Cant. Vis.</th>
                                        <th className="border-b border-r border-border px-2 py-1.5 text-center text-violet-300 sticky top-0 bg-slate-800 z-10">Def. Vis.</th>
                                        <th className="border-b border-border px-2 py-1.5 text-center text-violet-300 sticky top-0 bg-slate-800 z-10">Tasa Vis. %</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {record.factories?.map((f, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-muted/10">
                                          <td className="border-r border-border/50 px-2 py-1.5 font-medium text-left">{f.factoryBuyer}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-cyan-950/30">{f.totalAudit}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-cyan-950/30">{f.totalFail}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.totalRate}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-amber-950/30">{f.measQty}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-amber-950/30">{f.measDef}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5">{f.measRate}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-violet-950/30">{f.visQty}</td>
                                          <td className="border-r border-border/50 px-2 py-1.5 bg-violet-950/30">{f.visDef}</td>
                                          <td className="px-2 py-1.5">{f.visRate}</td>
                                        </tr>
                                      ))}
                                      {record.totals && (
                                        <tr className="border-t-2 border-primary/50 bg-primary/5 font-bold">
                                          <td className="border-r border-border/50 px-2 py-2 text-left text-primary">{record.totals.factoryBuyer}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-cyan-950/40">{record.totals.totalAudit}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-cyan-950/40">{record.totals.totalFail}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.totalRate}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-amber-950/40">{record.totals.measQty}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-amber-950/40">{record.totals.measDef}</td>
                                          <td className="border-r border-border/50 px-2 py-2">{record.totals.measRate}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-violet-950/40">{record.totals.visQty}</td>
                                          <td className="border-r border-border/50 px-2 py-2 bg-violet-950/40">{record.totals.visDef}</td>
                                          <td className="px-2 py-2">{record.totals.visRate}</td>
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

        {/* Split edit modal */}
        {splitRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setSplitRecord(null)}>
            <div className="bg-card border border-border rounded-xl p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-amber-400" />
                  Dividir registro — {splitRecord.startDate} al {splitRecord.endDate}
                </h3>
                <button onClick={() => setSplitRecord(null)} className="p-1 rounded hover:bg-muted/30 text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Este registro cruza meses. Edita los datos de cada mes por separado. Al guardar se eliminará el registro original y se crearán registros independientes.
              </p>
              <div className="space-y-6">
                {getMonthSplit(splitRecord.startDate, splitRecord.endDate).map(ms => {
                  const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
                  const monthData = splitEditData[key] || [];
                  const calcTotals = (data: FactoryRow[]) => {
                    const s = data.reduce((acc, f) => ({
                      totalAudit: acc.totalAudit + f.totalAudit,
                      totalFail: acc.totalFail + f.totalFail,
                      measQty: acc.measQty + f.measQty,
                      measDef: acc.measDef + f.measDef,
                      visQty: acc.visQty + f.visQty,
                      visDef: acc.visDef + f.visDef,
                    }), { totalAudit: 0, totalFail: 0, measQty: 0, measDef: 0, visQty: 0, visDef: 0 });
                    return s;
                  };
                  const totalsM = calcTotals(monthData);
                  return (
                    <div key={key} className="rounded-lg border border-border/60 bg-muted/5 p-4">
                      <h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {MONTHS[ms.month - 1]} {ms.year}
                        <span className="text-[10px] text-muted-foreground font-normal">({ms.days} días)</span>
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-800">
                              <th className="border border-border px-2 py-1.5 text-left text-white">Fábrica / Comprador</th>
                              <th className="border border-border px-2 py-1.5 text-cyan-300">No. Auditoría</th>
                              <th className="border border-border px-2 py-1.5 text-cyan-300">No. Fallos</th>
                              <th className="border border-border px-2 py-1.5 text-amber-300">Cant. Med.</th>
                              <th className="border border-border px-2 py-1.5 text-amber-300">Def. Med.</th>
                              <th className="border border-border px-2 py-1.5 text-violet-300">Cant. Vis.</th>
                              <th className="border border-border px-2 py-1.5 text-violet-300">Def. Vis.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthData.map((f, fi) => (
                              <tr key={fi} className="border-b border-border/40">
                                <td className="border-r border-border/40 px-2 py-1.5 font-medium text-foreground">{f.factoryBuyer}</td>
                                <td className="border-r border-border/40 px-2 py-1.5">
                                  <input type="text" value={f.totalAudit}
                                    onChange={e => handleSplitCellChange(key, fi, 'totalAudit', e.target.value)}
                                    className="w-16 rounded border border-amber-500/30 bg-amber-900/10 px-1.5 py-0.5 text-center text-foreground" />
                                </td>
                                <td className="border-r border-border/40 px-2 py-1.5">
                                  <input type="text" value={f.totalFail}
                                    onChange={e => handleSplitCellChange(key, fi, 'totalFail', e.target.value)}
                                    className="w-16 rounded border border-amber-500/30 bg-amber-900/10 px-1.5 py-0.5 text-center text-foreground" />
                                </td>
                                <td className="border-r border-border/40 px-2 py-1.5">
                                  <input type="text" value={f.measQty}
                                    onChange={e => handleSplitCellChange(key, fi, 'measQty', e.target.value)}
                                    className="w-16 rounded border border-amber-500/30 bg-amber-900/10 px-1.5 py-0.5 text-center text-foreground" />
                                </td>
                                <td className="border-r border-border/40 px-2 py-1.5">
                                  <input type="text" value={f.measDef}
                                    onChange={e => handleSplitCellChange(key, fi, 'measDef', e.target.value)}
                                    className="w-16 rounded border border-amber-500/30 bg-amber-900/10 px-1.5 py-0.5 text-center text-foreground" />
                                </td>
                                <td className="border-r border-border/40 px-2 py-1.5">
                                  <input type="text" value={f.visQty}
                                    onChange={e => handleSplitCellChange(key, fi, 'visQty', e.target.value)}
                                    className="w-16 rounded border border-amber-500/30 bg-amber-900/10 px-1.5 py-0.5 text-center text-foreground" />
                                </td>
                                <td className="border-r border-border/40 px-2 py-1.5">
                                  <input type="text" value={f.visDef}
                                    onChange={e => handleSplitCellChange(key, fi, 'visDef', e.target.value)}
                                    className="w-16 rounded border border-amber-500/30 bg-amber-900/10 px-1.5 py-0.5 text-center text-foreground" />
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-primary/5 font-bold">
                              <td className="border border-border/40 px-2 py-1.5 text-primary">Subtotal</td>
                              <td className="border border-border/40 px-2 py-1.5 text-cyan-300">{totalsM.totalAudit}</td>
                              <td className="border border-border/40 px-2 py-1.5 text-cyan-300">{totalsM.totalFail}</td>
                              <td className="border border-border/40 px-2 py-1.5 text-amber-300">{totalsM.measQty}</td>
                              <td className="border border-border/40 px-2 py-1.5 text-amber-300">{totalsM.measDef}</td>
                              <td className="border border-border/40 px-2 py-1.5 text-violet-300">{totalsM.visQty}</td>
                              <td className="border border-border/40 px-2 py-1.5 text-violet-300">{totalsM.visDef}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSplitRecord(null)} className="border-border">
                  Cancelar
                </Button>
                <Button size="sm" onClick={saveSplit} className="bg-amber-600 text-white hover:bg-amber-700">
                  <Save className="mr-2 h-4 w-4" /> Guardar datos separados por mes
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
