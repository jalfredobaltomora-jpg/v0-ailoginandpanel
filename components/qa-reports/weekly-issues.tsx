'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, Sparkles, Edit, ClipboardCopy, Save, RotateCcw, BarChart3, CalendarDays, ChevronLeft, ChevronRight, X, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { get, ref, db, push, set, update } from '@/lib/firebase';

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

const ORDEN_JERARQUICO: Record<string, number> = {
  'SAE-A TECHNOTEX, S.A(1)': 1,
  'SAE-A TECHNOTEX, S.A(2)': 2,
  'EINS, S.A.(2)': 3,
};

const XLSX_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCurrentBusinessWeek(): { weekNumber: number; year: number; month: number; startDate: string; endDate: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const start = toLocalDateStr(monday);
  const end = toLocalDateStr(friday);

  const jan1 = new Date(monday.getFullYear(), 0, 1);
  const days = Math.floor((monday.getTime() - jan1.getTime()) / 86400000);
  const weekNumber = Math.ceil((days + jan1.getDay() + 1) / 7);

  return {
    weekNumber,
    year: monday.getFullYear(),
    month: monday.getMonth() + 1,
    startDate: start,
    endDate: end,
    label: `Semana ${weekNumber} - ${monday.getFullYear()}`,
  };
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

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

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

function DateRangePicker({ startDate, endDate, onChange }: { startDate: string; endDate: string; onChange: (s: string, e: string) => void }) {
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
      if (dateStr < startDate) {
        onChange(dateStr, startDate);
      } else {
        onChange(startDate, dateStr);
      }
      setSelecting('start');
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else { setViewMonth(v => v - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else { setViewMonth(v => v + 1); }
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`e${i}`} className="w-9 h-9" />);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      <div key={d} className={cellClass(d)} onClick={() => handleDayClick(d)}>
        {d}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-center justify-between w-full mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-muted/30 text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-foreground">{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-muted/30 text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(d => <div key={d} className="w-9 h-7 text-xs text-center text-muted-foreground font-medium flex items-center justify-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>
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

export function WeeklyIssues() {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [totals, setTotals] = useState<FactoryRow | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [recentRecords, setRecentRecords] = useState<WeeklyRecord[]>([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editSplitRecord, setEditSplitRecord] = useState<WeeklyRecord | null>(null);
  const [splitEditData, setSplitEditData] = useState<Record<string, FactoryRow[]>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadRecentRecords(); }, []);

  const loadXLSX = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).XLSX) { resolve(); return; }
      const s = document.createElement('script');
      s.src = XLSX_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar el lector de Excel'));
      document.head.appendChild(s);
    });
  };

  const loadRecentRecords = async () => {
    try {
      const snapshot = await get(ref(db, 'qa-reports/weekly-registry'));
      const data = snapshot.val() || {};
      const records: WeeklyRecord[] = Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...v }));
      records.sort((a, b) => a.year - b.year || a.weekNumber - b.weekNumber);
      setRecentRecords(records);
    } catch { /* silent */ }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Solo se aceptan archivos .xlsx, .xls o .csv');
      return;
    }
    setLoading(true);
    setStatusMsg('');
    try {
      await loadXLSX();
      const XLSX = (window as any).XLSX;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matriz: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      if (matriz.length === 0) { alert('El archivo está vacío.'); setLoading(false); return; }

      const parsed: FactoryRow[] = [];

      for (let i = 0; i < matriz.length; i++) {
        const fila = matriz[i];
        if (!fila || fila.length === 0) continue;
        const colA = String(fila[0] || '').trim();
        const colB = String(fila[1] || '').trim();
        const factoryBuyerVal = colB || colA;

        if (!factoryBuyerVal || factoryBuyerVal.toUpperCase() === 'FACTORY BUYER' || factoryBuyerVal === 'QA' || factoryBuyerVal.includes('합계')) continue;

        const len = fila.length;
        const vAudit = parseNum(fila[len - 9]);
        const vFail = parseNum(fila[len - 8]);
        const vMeasQty = parseNum(fila[len - 6]);
        const vMeasDef = parseNum(fila[len - 5]);
        const vVisQty = parseNum(fila[len - 3]);
        const vVisDef = parseNum(fila[len - 2]);
        const buyerVal = fila[28] !== undefined ? String(fila[28]).trim() : '';

        parsed.push({
          factoryBuyer: factoryBuyerVal,
          buyer: buyerVal,
          totalAudit: vAudit,
          totalFail: vFail,
          totalRate: '',
          measQty: vMeasQty,
          measDef: vMeasDef,
          measRate: '',
          visQty: vVisQty,
          visDef: vVisDef,
          visRate: '',
        });
      }

      parsed.sort((a, b) => {
        const oA = ORDEN_JERARQUICO[a.factoryBuyer] || 999;
        const oB = ORDEN_JERARQUICO[b.factoryBuyer] || 999;
        return oA - oB;
      });

      setFactories(parsed);
      computeTotals(parsed);
      const bw = getCurrentBusinessWeek();
      setCustomStartDate(bw.startDate);
      setCustomEndDate(bw.endDate);
      setShowDatePicker(false);
      setStep('preview');
      setEditMode(false);
      setStatusMsg(`✓ ${parsed.length} fábricas procesadas correctamente`);
    } catch (e) {
      alert('Error al procesar: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    }
    setLoading(false);
  };

  const computeTotals = (data: FactoryRow[]) => {
    let sAudit = 0, sFail = 0, sMQty = 0, sMDef = 0, sVQty = 0, sVDef = 0;
    data.forEach(f => {
      f.totalRate = calcularPorcentaje(f.totalFail, f.totalAudit);
      f.measRate = calcularPorcentaje(f.measDef, f.measQty);
      f.visRate = calcularPorcentaje(f.visDef, f.visQty);
      sAudit += f.totalAudit; sFail += f.totalFail;
      sMQty += f.measQty; sMDef += f.measDef;
      sVQty += f.visQty; sVDef += f.visDef;
    });
    setTotals({
      factoryBuyer: 'Total General',
      buyer: '',
      totalAudit: sAudit, totalFail: sFail,
      totalRate: calcularPorcentaje(sFail, sAudit),
      measQty: sMQty, measDef: sMDef,
      measRate: calcularPorcentaje(sMDef, sMQty),
      visQty: sVQty, visDef: sVDef,
      visRate: calcularPorcentaje(sVDef, sVQty),
    });
  };

  const handleDeleteRow = (index: number) => {
    const updated = factories.filter((_, i) => i !== index);
    setFactories(updated);
    setStatusMsg('🗑️ Fila eliminada');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const toggleEdit = () => {
    setEditMode(true);
    setStatusMsg('✏️ Modo edición activado - modifica los valores numéricos');
  };

  const handleCellChange = (index: number, field: keyof FactoryRow, value: string) => {
    const updated = [...factories];
    (updated[index] as any)[field] = parseNum(value);
    setFactories(updated);
  };

  const saveEdits = () => {
    computeTotals(factories);
    setEditMode(false);
    setStatusMsg('🔄 Datos recalculados y guardados');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const saveToFirebase = async () => {
    if (!totals) return;
    const s = customStartDate || getCurrentBusinessWeek().startDate;
    const e = customEndDate || getCurrentBusinessWeek().endDate;
    const startYear = parseInt(s.slice(0, 4));
    const startMonth = parseInt(s.slice(5, 7));
    const jan1 = new Date(startYear, 0, 1);
    const monday = new Date(s + 'T12:00:00');
    const days = Math.floor((monday.getTime() - jan1.getTime()) / 86400000);
    const weekNumber = Math.ceil((days + jan1.getDay() + 1) / 7);
    const monthSplit = getMonthSplit(s, e);
    const record: any = {
      weekNumber,
      year: startYear,
      month: startMonth,
      startDate: s,
      endDate: e,
      label: `Semana ${weekNumber} - ${startYear}`,
      createdAt: Date.now(),
      factories,
      totals,
    };
    if (monthSplit.length > 1) record._monthSplit = monthSplit;
    const newRef = push(ref(db, 'qa-reports/weekly-registry'));
    await set(newRef, record);
    await loadRecentRecords();
    return record;
  };

  const openSplitEdit = (record: WeeklyRecord) => {
    if (!record._monthSplit) return;
    const edit: Record<string, FactoryRow[]> = {};
    record._monthSplit.forEach(ms => {
      const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
      edit[key] = record.factories.map(f => ({ ...f }));
    });
    setSplitEditData(edit);
    setEditSplitRecord(record);
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

  const saveSplitEdit = async () => {
    if (!editSplitRecord || !editSplitRecord._monthSplit) return;
    try {
      const origStart = new Date(editSplitRecord.startDate + 'T12:00:00');
      const origEnd = new Date(editSplitRecord.endDate + 'T12:00:00');
      for (const ms of editSplitRecord._monthSplit) {
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
        const weekNumber = editSplitRecord.weekNumber;
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
          _splitFrom: editSplitRecord.id,
        };
        const newRef = push(ref(db, 'qa-reports/weekly-registry'));
        await set(newRef, record);
      }
      // delete old combined record
      await set(ref(db, `qa-reports/weekly-registry/${editSplitRecord.id}`), null);
      setEditSplitRecord(null);
      setSplitEditData({});
      await loadRecentRecords();
      setStatusMsg('✅ Datos separados por mes guardados correctamente');
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (e) {
      alert('Error al guardar: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    }
  };

  const copyToClipboard = async () => {
    const mapeoFilas = [9, 10, 11];
    const lines = factories.map((f, i) => {
      const numFila = mapeoFilas[i];
      if (!numFila) return '';
      const dAudit = String(f.totalAudit);
      const eFailure = String(f.totalFail);
      const fFormula = `=SI.ERROR(E${numFila}/D${numFila};0%)`;
      const gScore = `=SI(F${numFila}>0.9%;"2.5";SI(F${numFila}>0.7%;"5";SI(F${numFila}>0.5%;"7.5";SI(F${numFila}>0.3%;"10";SI(F${numFila}>=0%;"12.5")))))`;
      const hRate = (parseNum(f.visRate.replace('%', '')) / 100).toFixed(4);
      const iScoreVis = `=SI(H${numFila}>2.9%;"2.5";SI(H${numFila}>2.7%;"5";SI(H${numFila}>2.5%;"7.5";SI(H${numFila}>2.3%;"10";SI(H${numFila}>=0%;"12.5")))))`;
      const jRate = (parseNum(f.measRate.replace('%', '')) / 100).toFixed(4);
      return `${dAudit}\t${eFailure}\t${fFormula}\t${gScore}\t${hRate}\t${iScoreVis}\t${jRate}`;
    }).filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      const weekInfo = await saveToFirebase();
      setStatusMsg(`✅ Datos copiados al portapapeles y guardados en registro (${weekInfo?.label || ''}). Pégalos en Excel desde D9.`);
      setTimeout(() => setStatusMsg(''), 6000);
    } catch {
      alert('Error al copiar al portapapeles');
    }
  };

  const resetAll = () => {
    setStep('upload');
    setFactories([]);
    setTotals(null);
    setEditMode(false);
    setStatusMsg('');
  };

  const renderCell = (index: number, field: keyof FactoryRow, value: string | number) => {
    if (editMode && (field === 'totalAudit' || field === 'totalFail' || field === 'measQty' || field === 'measDef' || field === 'visQty' || field === 'visDef')) {
      return (
        <input
          type="text"
          defaultValue={value}
          onChange={(e) => handleCellChange(index, field, e.target.value)}
          className="w-[70px] rounded border-2 border-amber-500 bg-amber-900/20 px-2 py-1 text-center text-sm font-bold text-foreground"
        />
      );
    }
    return <span>{value}</span>;
  };

  return (
    <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BarChart3 className="h-5 w-5" />
              Weekly Issues Reports
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Módulo de Auditoría - Edición Global y Portapapeles Inteligente
            </p>
          </div>
          {step === 'preview' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetAll} className="border-border">
                <RotateCcw className="mr-1 h-4 w-4" /> Nuevo
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-primary mb-2">
                <Upload className="h-4 w-4" /> Paso 1: Cargar Reporte Semanal
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Seleccione el archivo original de inspección (.xlsx, .xls o .csv)
              </p>
              <div
                className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors border-border hover:border-primary/50 bg-muted/10 cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Arrastre el archivo o haga clic para seleccionar</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">.xlsx .xls .csv · Reporte de inspección semanal</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>

            {/* Recent records */}
            {recentRecords.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <Save className="h-4 w-4" /> Registro de semanas guardadas
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {recentRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded bg-card/50 px-3 py-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-medium">{r.label}</span>
                        <span className="text-muted-foreground">{r.startDate} al {r.endDate} · {r.factories?.length || 0} fábricas</span>
                        {r._monthSplit && r._monthSplit.length > 1 && (
                          <span className="text-amber-400 font-medium text-[10px] border border-amber-500/30 rounded px-1.5 py-0.5">
                            {r._monthSplit.map(ms => MONTHS[ms.month - 1]).join(' + ')}
                          </span>
                        )}
                      </div>
                      {r._monthSplit && r._monthSplit.length > 1 && (
                        <Button variant="outline" size="sm" className="h-7 text-[11px] border-amber-500/30 text-amber-400 hover:text-amber-300"
                          onClick={() => openSplitEdit(r)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar x mes
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Status */}
            {statusMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                {statusMsg.startsWith('✓') || statusMsg.startsWith('✅') ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : statusMsg.startsWith('✏️') ? (
                  <Edit className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {!editMode ? (
                <>
                  <Button onClick={toggleEdit} className="bg-amber-600 text-white hover:bg-amber-700">
                    <Edit className="mr-2 h-4 w-4" /> Editar Datos
                  </Button>
                  <Button onClick={copyToClipboard} className="bg-green-600 text-white hover:bg-green-700">
                    <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Datos
                  </Button>
                </>
              ) : (
                <Button onClick={saveEdits} className="bg-purple-600 text-white hover:bg-purple-700">
                  <Sparkles className="mr-2 h-4 w-4" /> Calcular y Guardar
                </Button>
              )}
            </div>

            {/* Date picker */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Período del reporte</p>
                    <p className="text-xs text-muted-foreground">
                      {customStartDate && customEndDate
                        ? `${customStartDate} al ${customEndDate}`
                        : 'Semana detectada automáticamente'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowDatePicker(!showDatePicker)} className="border-border">
                  <CalendarDays className="mr-1 h-4 w-4" />
                  {showDatePicker ? 'Ocultar calendario' : 'Cambiar fechas'}
                </Button>
              </div>
              {showDatePicker && (
                <div className="mt-4 flex justify-center">
                  <DateRangePicker
                    startDate={customStartDate}
                    endDate={customEndDate}
                    onChange={(s, e) => {
                      setCustomStartDate(s);
                      setCustomEndDate(e);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border max-h-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800">
                    <th rowSpan={2} className="border-b border-r border-border px-3 py-2.5 text-left font-semibold text-white sticky top-0 bg-slate-800 z-10">Factory Buyer</th>
                    <th colSpan={3} className="border-b border-r border-border px-3 py-2.5 text-center font-semibold text-white sticky top-0 bg-slate-800 z-10">TOTAL</th>
                    <th colSpan={3} className="border-b border-r border-border px-3 py-2.5 text-center font-semibold text-white sticky top-0 bg-slate-800 z-10">MEASUREMENT</th>
                    <th colSpan={3} className="border-b border-border px-3 py-2.5 text-center font-semibold text-white sticky top-0 bg-slate-800 z-10">VISUAL</th>
                    {editMode && <th rowSpan={2} className="border-b border-l border-border px-3 py-2.5 text-center font-semibold text-red-400 sticky top-0 bg-slate-800 z-10">Eliminar</th>}
                  </tr>
                  <tr className="bg-slate-700">
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-cyan-300 sticky top-[41px] bg-slate-700 z-10">No. Audit</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-cyan-300 sticky top-[41px] bg-slate-700 z-10">No. Failure</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-muted-foreground sticky top-[41px] bg-slate-700 z-10">Failure Rate (%)</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-amber-300 sticky top-[41px] bg-slate-700 z-10">Insp. Qty</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-amber-300 sticky top-[41px] bg-slate-700 z-10">Def. Qty</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-amber-300 sticky top-[41px] bg-slate-700 z-10">Defect Rate (%)</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-violet-300 sticky top-[41px] bg-slate-700 z-10">Insp. Qty</th>
                    <th className="border-b border-r border-border px-3 py-2 text-xs font-medium text-violet-300 sticky top-[41px] bg-slate-700 z-10">Def. Qty</th>
                    <th className="border-b border-border px-3 py-2 text-xs font-medium text-violet-300 sticky top-[41px] bg-slate-700 z-10">Defect Rate (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {factories.map((f, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="border-r border-border/50 px-3 py-2.5 font-medium text-left">{f.factoryBuyer}</td>
                      {editMode && (
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRow(i)}
                            className="rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-500 transition-colors"
                          >
                            X
                          </button>
                        </td>
                      )}
                      <td className="border-r border-border/50 px-3 py-2.5 bg-cyan-950/30 font-medium">{renderCell(i, 'totalAudit', f.totalAudit)}</td>
                      <td className="border-r border-border/50 px-3 py-2.5 bg-cyan-950/30 font-medium">{renderCell(i, 'totalFail', f.totalFail)}</td>
                      <td className="border-r border-border/50 px-3 py-2.5">{f.totalRate}</td>
                      <td className="border-r border-border/50 px-3 py-2.5">{renderCell(i, 'measQty', f.measQty)}</td>
                      <td className="border-r border-border/50 px-3 py-2.5">{renderCell(i, 'measDef', f.measDef)}</td>
                      <td className="border-r border-border/50 px-3 py-2.5 bg-amber-950/30 font-medium">{f.measRate}</td>
                      <td className="border-r border-border/50 px-3 py-2.5">{renderCell(i, 'visQty', f.visQty)}</td>
                      <td className="border-r border-border/50 px-3 py-2.5">{renderCell(i, 'visDef', f.visDef)}</td>
                      <td className="px-3 py-2.5 bg-violet-950/30 font-medium">{f.visRate}</td>
                    </tr>
                  ))}
                  {totals && (
                    <tr className="border-t-2 border-primary/50 bg-primary/5 font-bold">
                      <td className="border-r border-border/50 px-3 py-3 text-left text-primary">{totals.factoryBuyer}</td>
                      <td className="border-r border-border/50 px-3 py-3 bg-cyan-950/40">{totals.totalAudit}</td>
                      <td className="border-r border-border/50 px-3 py-3 bg-cyan-950/40">{totals.totalFail}</td>
                      <td className="border-r border-border/50 px-3 py-3">{totals.totalRate}</td>
                      <td className="border-r border-border/50 px-3 py-3">{totals.measQty}</td>
                      <td className="border-r border-border/50 px-3 py-3">{totals.measDef}</td>
                      <td className="border-r border-border/50 px-3 py-3 bg-amber-950/40">{totals.measRate}</td>
                      <td className="border-r border-border/50 px-3 py-3">{totals.visQty}</td>
                      <td className="border-r border-border/50 px-3 py-3">{totals.visDef}</td>
                      <td className="px-3 py-3 bg-violet-950/40">{totals.visRate}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Split edit modal */}
        {editSplitRecord && editSplitRecord._monthSplit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setEditSplitRecord(null)}>
            <div className="bg-card border border-border rounded-xl p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-amber-400" />
                  Editar datos por mes — {editSplitRecord.label}
                </h3>
                <button onClick={() => setEditSplitRecord(null)} className="p-1 rounded hover:bg-muted/30 text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Este registro abarca múltiples meses. Edita los datos de cada mes por separado. Al guardar se crearán registros independientes.
              </p>
              <div className="space-y-6">
                {editSplitRecord._monthSplit.map(ms => {
                  const key = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
                  const monthData = splitEditData[key] || [];
                  const computeTotalsMonth = (data: FactoryRow[]) => {
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
                  const totalsM = computeTotalsMonth(monthData);
                  return (
                    <div key={key} className="rounded-lg border border-border/60 bg-muted/5 p-4">
                      <h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {MONTHS[ms.month - 1]} {ms.year}
                        <span className="text-[10px] text-muted-foreground font-normal">({ms.days} días, factor {Math.round(ms.factor * 100)}%)</span>
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-800">
                              <th className="border border-border px-2 py-1.5 text-left text-white">Factory Buyer</th>
                              <th className="border border-border px-2 py-1.5 text-cyan-300">No. Audit</th>
                              <th className="border border-border px-2 py-1.5 text-cyan-300">No. Failure</th>
                              <th className="border border-border px-2 py-1.5 text-amber-300">Meas Qty</th>
                              <th className="border border-border px-2 py-1.5 text-amber-300">Meas Def</th>
                              <th className="border border-border px-2 py-1.5 text-violet-300">Vis Qty</th>
                              <th className="border border-border px-2 py-1.5 text-violet-300">Vis Def</th>
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
                <Button variant="outline" size="sm" onClick={() => setEditSplitRecord(null)} className="border-border">
                  Cancelar
                </Button>
                <Button size="sm" onClick={saveSplitEdit} className="bg-amber-600 text-white hover:bg-amber-700">
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
