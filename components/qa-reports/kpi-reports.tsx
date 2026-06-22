'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Download, Upload, BarChart3, Trash2, FileSpreadsheet, RefreshCw, AlertCircle, X, Lightbulb, Table2, Sparkles, FileText, Presentation, FileSpreadsheet as FileXlsx } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ref, push, onValue, remove, db, set } from '@/lib/firebase';
import { Chart, BarController, LineController, PieController, DoughnutController, PolarAreaController, RadarController, CategoryScale, LinearScale, RadialLinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler, type ChartTypeRegistry } from 'chart.js';

Chart.register(BarController, LineController, PieController, DoughnutController, PolarAreaController, RadarController, CategoryScale, LinearScale, RadialLinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const ORDEN_FABRICAS = ["SAE-A TECHNOTEX, S.A(1)","SAE-A TECHNOTEX, S.A(2)","EINS, S.A.(2)"];
const COLORS = ['#06b6d4','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#6366f1'];
const GOAL_COLORS = ['#FF0040','#FF8800','#CC00FF'];

const METRIC_CFG: Record<string, {type:'sum'|'rate',field?:string,num?:string,den?:string}> = {
  audits: {type:'sum',field:'audits'},
  failures: {type:'sum',field:'failures'},
  failureRate: {type:'rate',num:'failures',den:'audits'},
  measDef: {type:'sum',field:'measDef'},
  visDef: {type:'sum',field:'visDef'},
  measDefRate: {type:'rate',num:'measDef',den:'measIns'},
  visDefRate: {type:'rate',num:'visDef',den:'visIns'},
};

const Y_LABELS: Record<string,string> = {
  audits:'Auditorías', failures:'Fallos', failureRate:'Tasa de Fallo Total %',
  measDef:'Def. Medición', visDef:'Def. Visuales',
  measDefRate:'Tasa de Defecto de Medición %', visDefRate:'Tasa de Defecto Visual %'
};

interface RawRow {
  fecha: Date; mesFiltroKey: string; mesTexto: string;
  factory: string; buyer: string;
  colL: string; colM: string; stage: string; point: string;
  style: string; po: string; result: string;
  audits: number; failures: number; failureRate: number;
  measIns: number; measDef: number; measDefRate: number;
  visIns: number; visDef: number; visDefRate: number;
}

interface KPIBatch { id: string; year: number; month: number; label: string; createdAt: number; entries: RawRow[]; }

function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number' && v > 10000) return new Date((v - 25569) * 86400000);
  if (v) { const d = new Date(String(v).trim()); if (!isNaN(d.getTime())) return d; }
  return null;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  return Number(String(v || '').replace(/[^0-9.-]/g, '')) || 0;
}
function toStr(v: unknown): string { return v ? String(v).trim() : ''; }

function parseMatrix(matrix: unknown[][]): RawRow[] {
  const out: RawRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;
    const fecha = parseDate(row[1]);
    if (!fecha) continue;
    const factory = toStr(row[3]) || '';
    const buyer = toStr(row[4]) || '';
    if (/^\d+$/.test(factory) || buyer === 'NIC') continue;
    const m = fecha.getMonth(), y = fecha.getFullYear();
    out.push({
      fecha, mesFiltroKey: y + '-' + String(m + 1).padStart(2, '0'), mesTexto: MESES[m] + ' ' + y,
      factory, buyer, style: toStr(row[6]) || '', po: toStr(row[7]) || '',
      colL: toStr(row[11]) || '', colM: toStr(row[12]) || '',
      stage: toStr(row[13]) || '', point: toStr(row[14]) || '',
      result: toStr(row[16]) || 'N/A', audits: toNum(row[17]), failures: toNum(row[18]), failureRate: toNum(row[19]),
      measIns: toNum(row[20]), measDef: toNum(row[21]), measDefRate: toNum(row[22]),
      visIns: toNum(row[23]), visDef: toNum(row[24]), visDefRate: toNum(row[25]),
    });
  }
  return out;
}

function mtl(m: number, y: number): string { return MESES[m - 1] + ' ' + y; }
function sortFabrics(arr: string[]): string[] {
  return [...arr].sort((a, b) => (ORDEN_FABRICAS.indexOf(a) === -1 ? 99 : ORDEN_FABRICAS.indexOf(a)) - (ORDEN_FABRICAS.indexOf(b) === -1 ? 99 : ORDEN_FABRICAS.indexOf(b)));
}

function fmtPct(p: number, d: number): string { return d > 0 ? (p / d * 100).toFixed(2) + '%' : '0.00%'; }

function accumFor(m: string, r: RawRow): number | {num:number;den:number} {
  const c = METRIC_CFG[m];
  if (!c) return 0;
  if (c.type === 'sum' && c.field) return r[c.field as keyof RawRow] as number || 0;
  if (c.type === 'rate' && c.num && c.den) return {num: r[c.num as keyof RawRow] as number || 0, den: r[c.den as keyof RawRow] as number || 0};
  return 0;
}

function finalizeAcc(m: string, acc: any): number {
  const c = METRIC_CFG[m];
  if (!c) return 0;
  if (c.type === 'sum') return acc;
  if (c.type === 'rate') return acc.den > 0 ? (acc.num / acc.den) * 100 : 0;
  return 0;
}

function fmtChartVal(v: number, m: string): string {
  if (m === 'failureRate' || m === 'measDefRate' || m === 'visDefRate') return v.toFixed(2) + '%';
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
}
function fmtDate(d: Date | string | number | undefined | null): string {
  if (!d) return '';
  if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
  if (typeof d === 'number') { const dt = new Date(d); if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0]; }
  if (typeof d === 'string') return d.split('T')[0];
  return String(d);
}

export function KpiReports() {
  const [view, setView] = useState<'upload'|'dashboard'>('dashboard');
  const [batches, setBatches] = useState<KPIBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biOpen, setBiOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState<string|null>(null);
  const [chartType, setChartType] = useState('bar');
  const [chartX, setChartX] = useState('factory');
  const [chartMetrics, setChartMetrics] = useState<string[]>(['audits','failures']);
  const [chartAgg, setChartAgg] = useState('sum');
  const [chartStyle, setChartStyle] = useState('2d');
  const [goalFR, setGoalFR] = useState('10');
  const [goalMR, setGoalMR] = useState('15');
  const [goalVR, setGoalVR] = useState('20');
  const [yAxisMin, setYAxisMin] = useState('');
  const [yAxisMax, setYAxisMax] = useState('');
  const [fMonths, setFMonths] = useState<string[]>([]);
  const [fFactories, setFFactories] = useState<string[]>([]);
  const [fBuyers, setFBuyers] = useState<string[]>([]);
  const [fPoints, setFPoints] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const r = ref(db, 'qa-reports/kpi-data');
    const unsub = onValue(r, (snap) => {
      const raw: Record<string, KPIBatch> = snap.val() || {};
      const list = Object.entries(raw).map(([id, val]) => ({ ...val, id }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setBatches(list);
    });
    return unsub;
  }, []);

  const all = useMemo(() => batches.flatMap(b => b.entries), [batches]);
  const meses = useMemo(() => [...new Set(all.map(e => e.mesFiltroKey))].sort().reverse(), [all]);
  const monthLabels = useMemo(() => Object.fromEntries(
    meses.filter((m): m is string => typeof m === 'string' && m.includes('-'))
      .map(m => [m, mtl(Number(m.split('-')[1]), Number(m.split('-')[0]))])
  ), [meses]);
  const factories = useMemo(() => sortFabrics([...new Set(all.map(e => e.factory))]), [all]);
  const buyers = useMemo(() => [...new Set(all.map(e => e.buyer))].sort(), [all]);
  const points = useMemo(() => [...new Set(all.map(e => e.point).filter(Boolean))].sort(), [all]);

  useEffect(() => {
    if (all.length > 0 && fMonths.length === 0) {
      setFMonths(meses); setFFactories(factories); setFBuyers(buyers); setFPoints(points);
    }
  }, [all, meses, factories, buyers, points]);

  const filtered = useMemo(() => all.filter(e =>
    fMonths.includes(e.mesFiltroKey) && fFactories.includes(e.factory) &&
    fBuyers.includes(e.buyer) && fPoints.includes(e.point)
  ), [all, fMonths, fFactories, fBuyers, fPoints]);

  const isGoal = chartType === 'barMeta';
  const isPieChart = ['pie','doughnut','polarArea'].includes(chartType);

  // ─── Filter Dropdown ───
  function FilterDD({ label, options, labels, selected, onChange, id }: {
    label: string; options: string[]; labels?: Record<string,string>; selected: string[]; onChange: (v:string[]) => void; id: string;
  }) {
    const isOpen = dropOpen === id;
    const allSelected = selected.length === options.length;
    const toggle = (val: string) => {
      if (selected.includes(val)) onChange(selected.filter(v => v !== val));
      else onChange([...selected, val]);
    };
    return (
      <div className="relative min-w-[150px]">
        <label className="text-[10px] text-cyan-400 font-bold uppercase mb-1">{label}</label>
        <button onClick={(e) => { e.stopPropagation(); setDropOpen(isOpen ? null : id); }} className="w-full bg-[#21262d] border border-[#30363d] rounded-lg p-2 text-xs flex justify-between items-center text-foreground">
          <span className="truncate">{allSelected ? '-- TODOS --' : `${selected.length} Sel.`}</span>
          <svg className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {isOpen && <>
          <div className="fixed inset-0 z-40" onClick={() => setDropOpen(null)} />
          <div className="absolute top-full left-0 mt-1 min-w-[200px] max-h-60 overflow-auto bg-[#21262d] border border-[#30363d] rounded-lg p-1 z-50 shadow-xl space-y-0.5">
            <label className="flex items-center gap-2 text-xs p-1.5 hover:bg-[#30363d] rounded cursor-pointer text-foreground">
              <input type="checkbox" checked={allSelected} onChange={() => onChange(allSelected ? [] : [...options])} className="accent-cyan-500" />
              -- TODOS --
            </label>
            <div className="border-t border-[#30363d] my-0.5" />
            {options.map(o => (
              <label key={o} className="flex items-center gap-2 text-xs p-1.5 hover:bg-[#30363d] rounded cursor-pointer text-foreground">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="accent-cyan-500" />
                <span className="truncate">{labels?.[o] || o}</span>
              </label>
            ))}
          </div>
        </>}
      </div>
    );
  }

  // ─── Chart Generation ───
  function destroyChart() {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
  }

  function generateChart() {
    if (!filtered.length) return;
    const tipo = chartType;
    const xDim = chartX;
    const agg = chartAgg;
    const metrics = chartMetrics;
    if (!metrics.length) return;

    const getLabel = (r: RawRow): string => {
      if (xDim === 'factory') return r.factory;
      if (xDim === 'buyer') return r.buyer;
      if (xDim === 'point') return r.point || '(sin punto)';
      if (xDim === 'stage') return r.stage || '(sin stage)';
      if (xDim === 'month') return r.mesTexto;
      return '';
    };

    let labels: string[];
    const groups: Record<string, any> = {};

    if (agg === 'real') {
      labels = filtered.map(r => getLabel(r));
      metrics.forEach(m => {
        groups[m] = filtered.map(r => {
          const v = accumFor(m, r);
          return typeof v === 'object' ? ((v as any).den > 0 ? ((v as any).num / (v as any).den) * 100 : 0) : v;
        });
      });
    } else {
      filtered.forEach(r => {
        const lbl = getLabel(r);
        if (!groups[lbl]) groups[lbl] = {};
        metrics.forEach(m => {
          const c = METRIC_CFG[m];
          if (!groups[lbl][m]) groups[lbl][m] = c.type === 'rate' ? { num: 0, den: 0 } : { sum: 0, count: 0 };
          const v = accumFor(m, r);
          if (c.type === 'rate') { groups[lbl][m].num += (v as any).num; groups[lbl][m].den += (v as any).den; }
          else { groups[lbl][m].sum += (v as number); groups[lbl][m].count++; }
        });
      });
      const known = ORDEN_FABRICAS.filter(f => groups[f]);
      const unknown = Object.keys(groups).filter(l => !known.includes(l)).sort();
      labels = known.concat(unknown);
    }

    const getData = (m: string) => {
      if (agg === 'real') return groups[m];
      const c = METRIC_CFG[m];
      return labels.map(l => {
        const g = groups[l]?.[m];
        if (!g) return 0;
        if (c.type === 'rate') return finalizeAcc(m, g);
        if (agg === 'sum') return g.sum;
        if (agg === 'avg') return g.count ? g.sum / g.count : 0;
        if (agg === 'count') return g.count;
        return 0;
      });
    };

    const datasets: any[] = [];
    const goalValues = { failureRate: parseFloat(goalFR) || 0, measDefRate: parseFloat(goalMR) || 0, visDefRate: parseFloat(goalVR) || 0 };

    if (isGoal) {
      metrics.forEach((m, mi) => {
        const d = getData(m);
        datasets.push({
          label: Y_LABELS[m] + ' (' + {real:'Datos Reales',sum:'Suma',avg:'Promedio',count:'Conteo'}[agg] + ')',
          data: d, backgroundColor: COLORS[mi % COLORS.length] + '99', borderColor: COLORS[mi % COLORS.length],
          borderWidth: 1.5, order: 2,
        });
        const gv = (goalValues as any)[m] ?? 0;
        if (gv > 0) {
          datasets.push({
            label: 'Meta ' + Y_LABELS[m],
            data: labels.map(() => gv),
            type: 'line', borderColor: GOAL_COLORS[mi % 3], borderWidth: 3,
            pointRadius: 0, pointHitRadius: 0, fill: false, tension: 0, order: 1,
            _isGoalLine: true,
          });
        }
      });
    } else {
      metrics.forEach((m, mi) => {
        datasets.push({
          label: Y_LABELS[m] + ' (' + {real:'Datos Reales',sum:'Suma',avg:'Promedio',count:'Conteo'}[agg] + ')',
          data: getData(m),
          backgroundColor: isPieChart ? `hsla(${mi * 360 / metrics.length}, 70%, 55%, 0.7)` : COLORS[mi % COLORS.length] + '99',
          borderColor: isPieChart ? `hsla(${mi * 360 / metrics.length}, 70%, 45%, 1)` : COLORS[mi % COLORS.length],
          borderWidth: 1.5, ...(isPieChart ? {} : { borderRadius: 3 }),
        });
      });
    }

    // ─── Chart.js Plugins ───
    const valueLabelPlugin = {
      id: 'valueLabels',
      afterDraw(chart: Chart) {
        const ctx = chart.ctx;
        let barIdx = 0;
        chart.data.datasets.forEach((ds, di) => {
          if ((ds as any)._isGoalLine) return;
          const meta = chart.getDatasetMeta(di);
          if (!meta?.data) return;
          const mName = metrics[barIdx] || '';
          ctx.fillStyle = '#e5e7eb';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          meta.data.forEach((bar: any, i: number) => {
            const val = ds.data[i];
            if (val === undefined || val === null) return;
            ctx.textBaseline = 'bottom';
            let yPos = bar.y - 4;
            if (yPos < 10) { yPos = bar.y + 10; ctx.textBaseline = 'top'; }
            ctx.fillText(fmtChartVal(val as number, mName), bar.x, yPos);
          });
          barIdx++;
        });
      }
    };

    const barLabelPlugin = {
      id: 'barLabels',
      afterDraw(chart: Chart) {
        if (isPieChart) return;
        const ctx = chart.ctx;
        const xScale = chart.scales.x;
        if (!xScale) return;
        const nonLineCount = chart.data.datasets.filter(d => !(d as any)._isGoalLine).length;
        if (nonLineCount <= 1) return;
        chart.data.datasets.forEach((ds, di) => {
          if ((ds as any)._isGoalLine) return;
          const meta = chart.getDatasetMeta(di);
          if (!meta?.data) return;
          const mLabel = ds.label?.replace(/ \(.*\)/, '') || '';
          const yBottom = chart.scales.y.getPixelForValue(0);
          meta.data.forEach((bar: any) => {
            ctx.fillStyle = '#9ca3af';
            ctx.font = '7px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(mLabel, bar.x, yBottom + 2);
          });
        });
      }
    };

    const bar3DPlugin = {
      id: 'bar3D',
      afterDatasetDraw(chart: Chart, args: any) {
        if (chartStyle !== '3d' || isPieChart) return;
        const meta = args.meta;
        if (!meta || meta.type !== 'bar') return;
        const ctx = chart.ctx;
        const depth = 5;
        const ds = chart.data.datasets[args.index];
        if ((ds as any)._isGoalLine) return;
        const baseColor = ds.backgroundColor as string || 'rgba(6,182,212,0.4)';
        meta.data.forEach((bar: any) => {
          if (bar.hidden || bar.y === undefined || bar.base === undefined) return;
          const x = bar.x, y = bar.y, base = bar.base, w = bar.width;
          ctx.save();
          // Top face
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y);
          ctx.lineTo(x - w / 2 + depth, y - depth);
          ctx.lineTo(x + w / 2 + depth, y - depth);
          ctx.lineTo(x + w / 2, y);
          ctx.closePath();
          ctx.fillStyle = baseColor.replace('0.4','0.25').replace('0.6','0.4').replace('0.7','0.5').replace('0.99','0.6');
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.stroke();
          // Right side
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w / 2 + depth, y - depth);
          ctx.lineTo(x + w / 2 + depth, base - depth);
          ctx.lineTo(x + w / 2, base);
          ctx.closePath();
          ctx.fillStyle = baseColor.replace('0.4','0.6').replace('0.6','0.8').replace('0.7','0.85').replace('0.99','0.9');
          ctx.globalAlpha = 0.5;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }
    };

    const goalLabelPlugin = {
      id: 'goalLabels',
      afterDraw(chart: Chart) {
        if (!isGoal) return;
        const ctx = chart.ctx;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        if (!xScale || !yScale) return;
        const barTopYByLabel: Record<string, number> = {};
        chart.data.datasets.forEach((ds, di) => {
          if ((ds as any)._isGoalLine) return;
          const meta = chart.getDatasetMeta(di);
          meta?.data?.forEach((bar: any, i: number) => {
            const lbl = String(chart.data.labels?.[i] || '');
            if (!barTopYByLabel[lbl] || bar.y < barTopYByLabel[lbl]) barTopYByLabel[lbl] = bar.y;
          });
        });
        chart.data.datasets.forEach((ds, di) => {
          if (!(ds as any)._isGoalLine) return;
          const meta = chart.getDatasetMeta(di);
          if (!meta?.data?.length) return;
          const goalVal = ds.data[0] as number;
          if (goalVal === undefined) return;
          const yPx = (meta.data[0] as any).y;
          const goalColor = ds.borderColor as string || '#FF0040';
          const text = 'META ' + goalVal.toFixed(2) + '%';
          const lastLabel = String(chart.data.labels?.[chart.data.labels.length - 1] || '');
          const firstLabel = String(chart.data.labels?.[0] || '');
          let useRight = true;
          if (barTopYByLabel[lastLabel] !== undefined && Math.abs(barTopYByLabel[lastLabel] - yPx) < 25) useRight = false;
          let useMid = false;
          if (!useRight && barTopYByLabel[firstLabel] !== undefined && Math.abs(barTopYByLabel[firstLabel] - yPx) < 25) useMid = true;
          let xPx: number;
          if (useMid) {
            const midIdx = Math.floor((chart.data.labels?.length || 1) / 2);
            xPx = (meta.data[midIdx] as any)?.x || (xScale.left + xScale.right) / 2;
          } else if (useRight) {
            xPx = xScale.right - 8;
          } else {
            xPx = xScale.left + 8;
          }
          ctx.save();
          ctx.font = 'bold 8px monospace';
          const tw = ctx.measureText(text).width;
          const boxW = tw + 10;
          const boxH = 14;
          const boxX = useRight ? xPx - boxW : (useMid ? xPx - boxW / 2 : xPx);
          const boxY = yPx - boxH - 8;
          ctx.beginPath();
          ctx.moveTo(boxX + boxW / 2, boxY + boxH);
          ctx.lineTo(boxX + boxW / 2, yPx);
          ctx.strokeStyle = goalColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(boxX + boxW / 2 - 4, yPx - 5);
          ctx.lineTo(boxX + boxW / 2, yPx);
          ctx.lineTo(boxX + boxW / 2 + 4, yPx - 5);
          ctx.fillStyle = goalColor;
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeStyle = goalColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
          ctx.fillStyle = goalColor;
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2);
          ctx.restore();
        });
      }
    };

    destroyChart();
    const chartEl = canvasRef.current;
    if (!chartEl) return;

    const isPie = ['pie','doughnut','polarArea'].includes(tipo);
    const userMin = yAxisMin ? parseFloat(yAxisMin) : undefined;
    const userMax = yAxisMax ? parseFloat(yAxisMax) : undefined;
    const yOpts: any = isPie ? undefined : (() => {
      const autoMin = 0;
      let autoMax: number;
      const allVals = datasets.filter(d => !(d as any)._isGoalLine).flatMap((d: any) => d.data as number[]).filter((v: number) => v != null);
      const maxGoal = Math.max(...Object.values(goalValues).filter(v => v > 0), 0);
      const maxData = allVals.length ? Math.max(...allVals) : 1;
      autoMax = Math.max(maxGoal * 1.3, maxData * 1.15, 1);
      return {
        grid: { color: '#21262d', drawBorder: false },
        ticks: { color: '#8b949e', font: { size: 9 } as any },
        beginAtZero: true,
        ...(userMin !== undefined && { min: userMin }),
        ...(userMax !== undefined ? { max: userMax } : { max: autoMax }),
      };
    })();

    chartRef.current = new Chart(chartEl.getContext('2d')!, {
      type: (isPie ? tipo : 'bar') as keyof ChartTypeRegistry,
      data: { labels, datasets },
      plugins: isPie ? [valueLabelPlugin] : [valueLabelPlugin, barLabelPlugin, bar3DPlugin, goalLabelPlugin],
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b949e', font: { size: 9 } as any } },
          tooltip: {
            callbacks: {
              label(ctx: any) {
                const v = ctx.raw;
                const m = metrics[ctx.datasetIndex] || '';
                return ctx.dataset.label + ': ' + fmtChartVal(v, m);
              }
            }
          }
        },
        scales: (isPie ? undefined : {
          x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', font: { size: 8 } as any } } as any,
          y: yOpts as any,
        }) as any
      }
    });
  }

  useEffect(() => {
    if (biOpen && filtered.length) generateChart();
    else destroyChart();
    return destroyChart;
  }, [biOpen, filtered, chartType, chartX, chartMetrics, chartAgg, chartStyle, goalFR, goalMR, goalVR, yAxisMin, yAxisMax]);

  // ─── BI Matrix Table ───
  const biData = useMemo(() => {
    const map: Record<string, any> = {};
    let gAud = 0, gFail = 0, gMIns = 0, gMDef = 0, gVIns = 0, gVDef = 0;
    filtered.forEach(r => {
      const k = r.mesTexto + '|' + r.factory + '|' + r.buyer;
      if (!map[k]) map[k] = { mes: r.mesTexto, factory: r.factory, buyer: r.buyer, audits: 0, failures: 0, measIns: 0, measDef: 0, visIns: 0, visDef: 0 };
      map[k].audits += r.audits; map[k].failures += r.failures; map[k].measIns += r.measIns; map[k].measDef += r.measDef; map[k].visIns += r.visIns; map[k].visDef += r.visDef;
      gAud += r.audits; gFail += r.failures; gMIns += r.measIns; gMDef += r.measDef; gVIns += r.visIns; gVDef += r.visDef;
    });
    const rows = Object.values(map).sort((a: any, b: any) =>
      b.mes.localeCompare(a.mes) || ORDEN_FABRICAS.indexOf(a.factory) - ORDEN_FABRICAS.indexOf(b.factory) || a.buyer.localeCompare(b.buyer)
    );
    return { rows, totales: { audits: gAud, failures: gFail, measIns: gMIns, measDef: gMDef, visIns: gVIns, visDef: gVDef } };
  }, [filtered]);

  // ─── Insights ───
  const insights = useMemo(() => {
    const list: string[] = [];
    if (!filtered.length) return list;
    const ta = filtered.reduce((s, r) => s + r.audits, 0);
    const tf = filtered.reduce((s, r) => s + r.failures, 0);
    list.push(`Registros: ${filtered.length} | Auditorías: ${ta.toLocaleString()} | Fallos: ${tf.toLocaleString()}`);
    if (ta > 0) list.push(`Tasa de fallo global: ${((tf / ta) * 100).toFixed(1)}%`);
    const fb = [...new Set(filtered.map(r => r.factory))].map(f => {
      const entries = filtered.filter(r => r.factory === f);
      const aud = entries.reduce((s, r) => s + r.audits, 0);
      const fail = entries.reduce((s, r) => s + r.failures, 0);
      return { name: f, audits: aud, rate: aud > 0 ? (fail / aud) * 100 : 0 };
    }).sort((a, b) => b.audits - a.audits);
    if (fb.length) list.push(`Fábrica líder: ${fb[0].name} (${fb[0].audits.toLocaleString()} audits)`);
    if (fb.length > 1) list.push(`Mayor tasa de fallo: ${fb.reduce((a, b) => a.rate > b.rate ? a : b).name} (${fb.reduce((a, b) => a.rate > b.rate ? a : b).rate.toFixed(1)}%)`);
    return list;
  }, [filtered]);

  // ─── Upload ───
  async function handleFileUpload(f: File) {
    setError(''); setLoading(true);
    try {
      const XLSX = await import('xlsx');
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];
      const entries = parseMatrix(matrix);
      if (!entries.length) { setError('No se encontraron datos.'); setLoading(false); return; }
      const d = new Date();
      const b: Omit<KPIBatch, 'id'> = { year: d.getFullYear(), month: d.getMonth() + 1, label: mtl(d.getMonth() + 1, d.getFullYear()), createdAt: Date.now(), entries };
      const nr = await push(ref(db, 'qa-reports/kpi-data'));
      await set(nr, b);
      setView('dashboard'); setBiOpen(true);
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  async function handleDeleteBatch(id: string) { if (!confirm('¿Eliminar?')) return; await remove(ref(db, `qa-reports/kpi-data/${id}`)); }

  const [exportOpen, setExportOpen] = useState(false);

  function getActiveFilters() {
    return {
      months: fMonths.length === meses.length ? [] : fMonths,
      factories: fFactories.length === factories.length ? [] : fFactories,
      buyers: fBuyers.length === buyers.length ? [] : fBuyers,
      points: fPoints.length === points.length ? [] : fPoints,
    };
  }

  function getChartData() {
    const chart = chartRef.current;
    if (!chart) return null;
    return {
      labels: chart.data.labels as string[],
      datasets: chart.data.datasets.map(ds => ({
        label: ds.label ?? '',
        data: Array.from(ds.data as number[]),
      })),
    };
  }

  async function captureChartBase64(): Promise<string | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const maxW = 800;
    let cvs = canvas;
    if (canvas.width > maxW) {
      cvs = document.createElement('canvas');
      cvs.width = maxW;
      cvs.height = canvas.height * (maxW / canvas.width);
      const ctx = cvs.getContext('2d')!;
      ctx.fillStyle = '#0b111b';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(canvas, 0, 0, cvs.width, cvs.height);
    }
    return cvs.toDataURL('image/jpeg', 0.7);
  }

  async function handleExportEngine(format: 'pdf' | 'pptx' | 'xlsx') {
    if (!filtered.length) return;
    setExportOpen(false);

    if (format === 'pdf') {
      await handleExportPDF();
      return;
    }

    await exportViaAPI(format === 'xlsx' ? 'xlsx' : 'pptx', 'engine-monitor');
  }

  async function exportViaAPI(format: 'xlsx' | 'pptx', exportType: string = 'engine-monitor') {
    try {
      const chartData = (exportType === 'engine-monitor') ? getChartData() : null;
      const resp = await fetch('/api/export/control-administrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format,
          entries: filtered,
          chartData,
          filters: getActiveFilters(),
        }),
      });
      if (!resp.ok) {
        let msg = 'Error en exportacion';
        try { const err = await resp.json(); msg = err.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await resp.blob();
      downloadBlob(blob, exportType === 'control-administrative' ? `control_administrative.${format}` : `engine_monitor.${format}`);
    } catch (e: any) {
      console.warn('API export failed, falling back to client-side:', e);
      await clientExport(format, exportType);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function clientExport(format: 'xlsx' | 'pptx', exportType: string) {
    try {
      const chartData = (exportType === 'engine-monitor') ? getChartData() ?? undefined : undefined;
      const filters = getActiveFilters();
      const entries = filtered.map(r => ({
        ...r,
        fecha: r.fecha instanceof Date ? r.fecha.toISOString().slice(0, 10) : String(r.fecha),
      }));

      if (format === 'pptx') {
        const { generateEngineMonitorPPTX } = await import('@/lib/export-engine-monitor');
        const buf = await generateEngineMonitorPPTX(entries, undefined, filters);
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        downloadBlob(blob, 'engine_monitor.pptx');
      } else if (exportType === 'control-administrative') {
        const { generateControlAdministrativeXLSX } = await import('@/lib/export-control-administrative');
        const buf = await generateControlAdministrativeXLSX(entries as any);
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, 'control_administrative.xlsx');
      } else {
        const { generateEngineMonitorXLSX } = await import('@/lib/export-engine-monitor');
        const buf = await generateEngineMonitorXLSX(entries, undefined, filters, chartData);
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadBlob(blob, 'engine_monitor.xlsx');
      }
    } catch (e: any) {
      console.error('Client export error:', e);
      alert("Error al exportar: " + (e?.message || e));
    }
  }

  async function handleExportPDF() {
    // Client-side PDF using html2canvas + jsPDF
    try {
      const [html2canvas, jspdf] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const { default: html2canvasFn } = html2canvas;
      const { jsPDF } = jspdf;

      // Find the main card content area to capture
      const contentEl = document.querySelector('.max-w-7xl');
      if (!contentEl) { alert('No se encontró el contenido'); return; }

      const canvas = await html2canvasFn(contentEl as HTMLElement, {
        backgroundColor: '#0b111b',
        scale: 2,
        useCORS: true,
        logging: false,
        width: contentEl.scrollWidth,
        height: contentEl.scrollHeight,
        windowWidth: contentEl.scrollWidth,
        windowHeight: contentEl.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'letter');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pdfW * ratio;

      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, imgH);
      } else {
        // Multi-page if content is too tall
        const pageH = pdfH;
        let srcY = 0;
        let page = 0;
        while (srcY < canvas.height) {
          if (page > 0) pdf.addPage();
          const remaining = canvas.height - srcY;
          const sliceH = Math.min(remaining, canvas.width * (pageH / pdfW));
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceData = sliceCanvas.toDataURL('image/png');
          pdf.addImage(sliceData, 'PNG', 0, 0, pdfW, pageH);
          srcY += sliceH;
          page++;
        }
      }

      pdf.save('engine_monitor.pdf');
    } catch (e: any) {
      console.error('PDF export error:', e);
      alert("Error al exportar PDF: " + (e?.message || e));
    }
  }

  // ─── Render ───
  return (
    <Card className="mx-auto max-w-7xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-gray-950 p-2 rounded-lg font-extrabold tracking-wider text-xs shadow-md">SYSTEM JB</div>
            <div>
              <CardTitle className="flex items-center gap-2 text-primary text-base tracking-wide">Control Administrativo</CardTitle>
              <p className="text-[11px] text-cyan-400 font-mono">Motor de Datos con Panel Analítico Flotante Estilo PowerBI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <Button onClick={() => exportViaAPI('xlsx', 'control-administrative')} size="sm" className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white border-none">
                <Download className="mr-1 h-4 w-4" /> Base Depurada
              </Button>
            )}
            {batches.length > 0 && (
              <Button onClick={() => setBiOpen(!biOpen)} size="sm" className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-none">
                <BarChart3 className="mr-1 h-4 w-4" /> Generar Matriz Analítica IA
              </Button>
            )}
            <Button onClick={() => setView('upload')} size="sm" className={view === 'upload' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-none' : ''}>
              <Upload className="mr-1 h-4 w-4" /> Cargar Matriz de Datos
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {view === 'upload' && (
          <div onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-12 transition-colors hover:border-primary hover:bg-card/80"
          >
            <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-1 font-medium text-foreground">Cargar Matriz de Datos</p>
            <p className="text-sm text-muted-foreground">.xlsx .xls .csv</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Procesando datos...</p>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-6">
            {batches.length === 0 ? (
              <div className="rounded-xl border border-border bg-card/50 p-12 text-center space-y-4 my-auto">
                <div className="text-cyan-500 text-4xl"><FileSpreadsheet className="h-10 w-10 inline-block" /></div>
                <h2 className="text-sm font-semibold text-foreground">Base de Datos Lista para Extracción</h2>
                <p className="text-xs text-muted-foreground max-w-lg mx-auto">Carga la matriz de auditorías. Podrás abrir la subventana de Inteligencia Analítica para realizar comparativas dinámicas cruzadas en tiempo real.</p>
                <Button onClick={() => setView('upload')} size="sm"><Upload className="mr-2 h-4 w-4" /> Cargar Matriz de Datos</Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-border bg-card/50">
                  <FilterDD label="Meses" id="m" options={meses} labels={monthLabels} selected={fMonths} onChange={setFMonths} />
                  <FilterDD label="Fábricas" id="f" options={factories} selected={fFactories} onChange={setFFactories} />
                  <FilterDD label="Clientes" id="b" options={buyers} selected={fBuyers} onChange={setFBuyers} />
                  <FilterDD label="Point" id="p" options={points} selected={fPoints} onChange={setFPoints} />
                  <div className="ml-auto flex items-end">
                    <div className="text-xs bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-foreground">{filtered.length} registros</div>
                  </div>
                </div>

                {insights.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
                    <Lightbulb className="h-4 w-4 text-cyan-400 shrink-0" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">{insights.map((s, i) => <span key={i}>• {s}</span>)}</div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-card/80 overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="sticky top-0 z-10 bg-[#1c2128] text-gray-400 font-bold border-b border-gray-700 text-[10px] text-center">
                        <th colSpan={9} className="p-1.5 border-r border-gray-800 text-left text-cyan-400">GENERAL</th>
                        <th colSpan={3} className="p-1.5 border-r border-gray-800 bg-blue-950/20 text-blue-300">TOTAL FINAL</th>
                        <th colSpan={3} className="p-1.5 border-r border-gray-800 bg-emerald-950/20 text-emerald-300">MEDICIÓN</th>
                        <th colSpan={3} className="p-1.5 border-r border-gray-800 bg-amber-950/20 text-amber-300">VISUAL</th>
                        <th className="p-1.5">RESULTADO</th>
                      </tr>
                      <tr className="sticky top-[26px] z-10 bg-[#21262d] text-gray-300 font-semibold border-b border-gray-700 text-[11px]">
                        <th className="p-2 text-left">Fecha</th>
                        <th className="p-2 text-left">Fábrica</th>
                        <th className="p-2 text-left">Cliente</th>
                        <th className="p-2 text-left">Estilo</th>
                        <th className="p-2 text-left">PO</th>
                        <th className="p-2 text-left">Tipo</th>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">Etapa</th>
                        <th className="p-2 text-left border-r border-gray-800">Punto</th>
                        <th className="p-2 text-right">Auditorías</th>
                        <th className="p-2 text-right">Fallos</th>
                        <th className="p-2 text-right border-r border-gray-800 text-blue-400">Tasa de Fallo %</th>
<th className="p-2 text-right">Cant. Insp.</th>
                        <th className="p-2 text-right">Cant. Def.</th>
                        <th className="p-2 text-right border-r border-gray-800 text-emerald-400">Tasa de Def. %</th>
                        <th className="p-2 text-right">Cant. Insp.</th>
                        <th className="p-2 text-right">Cant. Def.</th>
                        <th className="p-2 text-right border-r border-gray-800 text-amber-400">Tasa de Def. %</th>
                        <th className="p-2 text-center">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {filtered.map((e, i) => (
                        <tr key={i} className="hover:bg-[#1c2128]/50 text-gray-300">
                          <td className="p-2 text-gray-400">{fmtDate(e.fecha)}</td>
                          <td className="p-2 font-semibold text-white">{e.factory}</td>
                          <td className="p-2">{e.buyer}</td>
                          <td className="p-2 text-gray-400">{e.style}</td>
                          <td className="p-2 text-gray-400 font-mono">{e.po}</td>
                          <td className="p-2 text-gray-400">{e.colL}</td>
                          <td className="p-2 text-gray-400">{e.colM}</td>
                          <td className="p-2 text-cyan-400 font-medium">{e.stage}</td>
                          <td className="p-2 text-gray-400 border-r border-gray-800">{e.point}</td>
                          <td className="p-2 text-right font-mono">{e.audits}</td>
                          <td className="p-2 text-right font-mono text-red-400">{e.failures}</td>
                          <td className="p-2 text-right font-mono text-blue-400 border-r border-gray-800">{fmtPct(e.failures, e.audits)}</td>
                          <td className="p-2 text-right font-mono">{e.measIns}</td>
                          <td className="p-2 text-right font-mono text-emerald-400">{e.measDef}</td>
                          <td className="p-2 text-right font-mono text-emerald-400 border-r border-gray-800">{fmtPct(e.measDef, e.measIns)}</td>
                          <td className="p-2 text-right font-mono">{e.visIns}</td>
                          <td className="p-2 text-right font-mono text-amber-400">{e.visDef}</td>
                          <td className="p-2 text-right font-mono text-amber-400 border-r border-gray-800">{fmtPct(e.visDef, e.visIns)}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${e.result === 'PASS' || e.result === 'PASA' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{e.result === 'PASS' ? 'PASA' : e.result === 'FAIL' ? 'FALLA' : e.result}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-border bg-card/80 p-4">
                  <h3 className="mb-4 font-semibold text-foreground text-sm">Historial de Cargas</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {batches.map(batch => (
                      <div key={batch.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{batch.label}</p>
                          <p className="text-xs text-muted-foreground">{batch.entries.length} registros · {new Date(batch.createdAt).toLocaleDateString('es-ES')}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteBatch(batch.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>

                {biOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBiOpen(false)}>
                    <div className="w-[95%] h-[90%] bg-[#161b22] border-2 border-cyan-500 rounded-xl flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <div className="bg-gradient-to-r from-gray-900 to-[#1c2128] border-b border-gray-700 px-4 py-2.5 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-amber-400 animate-pulse" />
                          <span className="text-xs font-bold tracking-wider text-white uppercase">Monitor del Motor: Inteligencia Analítica</span>
                        </div>
                        <div className="flex items-center gap-2 relative">
                          <Button onClick={() => setExportOpen(!exportOpen)} size="sm" className="bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white border-none h-7 text-[10px] px-2">
                            <Sparkles className="mr-1 h-3 w-3" /> Exportar
                          </Button>
                          {exportOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                              <div className="absolute right-0 top-full mt-1 min-w-[200px] bg-[#161b22] border border-[#30363d] rounded-lg p-1.5 z-50 shadow-xl space-y-1">
                                <button onClick={() => handleExportEngine('pdf')} className="flex items-center gap-3 w-full text-xs p-2.5 hover:bg-[#1c2128] rounded text-gray-200 transition-colors">
                                  <FileText className="h-4 w-4 text-red-400" />
                                  <span className="text-left"><span className="block font-semibold">PDF - Alta Fidelidad</span><span className="text-[10px] text-gray-500">Render dark mode, Carta horizontal</span></span>
                                </button>
                                <button onClick={() => handleExportEngine('pptx')} className="flex items-center gap-3 w-full text-xs p-2.5 hover:bg-[#1c2128] rounded text-gray-200 transition-colors">
                                  <Presentation className="h-4 w-4 text-orange-400" />
                                  <span className="text-left"><span className="block font-semibold">PPT - Presentación</span><span className="text-[10px] text-gray-500">4 slides con KPIs, graficos, tabla</span></span>
                                </button>
                                <button onClick={() => handleExportEngine('xlsx')} className="flex items-center gap-3 w-full text-xs p-2.5 hover:bg-[#1c2128] rounded text-gray-200 transition-colors">
                                  <FileXlsx className="h-4 w-4 text-green-400" />
                                  <span className="text-left"><span className="block font-semibold">XLSX - Analítico</span><span className="text-[10px] text-gray-500">Dark theme, gráfico insertado, filtros</span></span>
                                </button>
                              </div>
                            </>
                          )}
                          <button onClick={() => setBiOpen(false)} className="text-gray-400 hover:text-red-400 text-sm"><X className="h-4 w-4" /></button>
                        </div>
                      </div>

                      <div className="p-3 border-b border-gray-700 bg-[#161b22] flex flex-wrap gap-4 items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Filtros:</span>
                        <FilterDD label="Meses" id="bi-m" options={meses} labels={monthLabels} selected={fMonths} onChange={setFMonths} />
                        <FilterDD label="Fábricas" id="bi-f" options={factories} selected={fFactories} onChange={setFFactories} />
                        <FilterDD label="Clientes" id="bi-b" options={buyers} selected={fBuyers} onChange={setFBuyers} />
                        <FilterDD label="Point" id="bi-p" options={points} selected={fPoints} onChange={setFPoints} />
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto space-y-6 bg-[#11151c]">
                        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 flex flex-col">
                          <div className="flex flex-wrap gap-3 items-end mb-3">
                            <div>
                              <label className="text-[9px] text-cyan-400 font-bold uppercase block mb-0.5">Tipo</label>
                              <select value={chartType} onChange={(e) => { setChartType(e.target.value); if (e.target.value === 'barMeta') setChartMetrics(['failureRate','measDefRate','visDefRate']); }} className="bg-[#0d1117] text-xs p-1.5 border border-gray-600 rounded text-white">
                                <option value="bar">Barras</option>
                                <option value="barMeta">Barras con Meta</option>
                                <option value="line">Líneas</option>
                                <option value="pie">Pastel</option>
                                <option value="doughnut">Donas</option>
                                <option value="polarArea">Área Polar</option>
                                <option value="radar">Radar</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-cyan-400 font-bold uppercase block mb-0.5">Eje X</label>
                              <select value={chartX} onChange={(e) => setChartX(e.target.value)} className="bg-[#0d1117] text-xs p-1.5 border border-gray-600 rounded text-white">
                                <option value="factory">Fábrica</option>
                                <option value="buyer">Cliente</option>
                                <option value="point">Point</option>
                                <option value="stage">Stage</option>
                                <option value="month">Mes</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-cyan-400 font-bold uppercase block mb-0.5">Métricas</label>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 bg-[#0d1117] border border-gray-600 rounded p-1.5 text-[10px] max-w-[380px]">
                                {Object.entries(Y_LABELS).map(([k, v]) => (
                                  <label key={k} className="flex items-center gap-1 cursor-pointer text-gray-300">
                                    <input type="checkbox" checked={chartMetrics.includes(k)} onChange={() => { if (chartMetrics.length > 1 || !chartMetrics.includes(k)) setChartMetrics(chartMetrics.includes(k) ? chartMetrics.filter(x => x !== k) : [...chartMetrics, k]); }} className="accent-cyan-500" /> {v}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] text-cyan-400 font-bold uppercase block mb-0.5">Estilo</label>
                              <select value={chartStyle} onChange={(e) => setChartStyle(e.target.value)} className="bg-[#0d1117] text-xs p-1.5 border border-gray-600 rounded text-white">
                                <option value="2d">2D</option>
                                <option value="3d">3D</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-cyan-400 font-bold uppercase block mb-0.5">Agregación</label>
                              <select value={chartAgg} onChange={(e) => setChartAgg(e.target.value)} className="bg-[#0d1117] text-xs p-1.5 border border-gray-600 rounded text-white">
                                <option value="real">Datos Reales</option>
                                <option value="sum">Suma</option>
                                <option value="avg">Promedio</option>
                                <option value="count">Conteo</option>
                              </select>
                            </div>
                            <button onClick={generateChart} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-md transition-all mt-4">
                              <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Generar
                            </button>
                          </div>

                          {!isPieChart && (
                            <div className="flex flex-wrap gap-3 items-end mb-3 p-2 bg-[#0d1117] border border-cyan-600/30 rounded-lg">
                              <span className="text-[10px] text-cyan-400 font-bold uppercase">Eje Y:</span>
                              <div><label className="text-[9px] text-gray-400 block">Min (auto si vacío)</label><input type="number" step="any" value={yAxisMin} onChange={(e) => setYAxisMin(e.target.value)} placeholder="0" className="bg-[#21262d] text-xs p-1 w-20 border border-gray-600 rounded text-white" /></div>
                              <div><label className="text-[9px] text-gray-400 block">Max (auto si vacío)</label><input type="number" step="any" value={yAxisMax} onChange={(e) => setYAxisMax(e.target.value)} placeholder="auto" className="bg-[#21262d] text-xs p-1 w-20 border border-gray-600 rounded text-white" /></div>
                            </div>
                          )}
                          {isGoal && (
                            <div className="flex flex-wrap gap-3 items-end mb-3 p-2 bg-[#0d1117] border border-amber-600/40 rounded-lg">
                              <span className="text-[10px] text-amber-400 font-bold uppercase">Metas:</span>
                              <div><label className="text-[9px] text-gray-400 block">Failure Rate %</label><input type="number" step="0.1" value={goalFR} onChange={(e) => setGoalFR(e.target.value)} className="bg-[#21262d] text-xs p-1 w-20 border border-gray-600 rounded text-white" /></div>
                              <div><label className="text-[9px] text-gray-400 block">Meas Tasa de Def. %</label><input type="number" step="0.1" value={goalMR} onChange={(e) => setGoalMR(e.target.value)} className="bg-[#21262d] text-xs p-1 w-20 border border-gray-600 rounded text-white" /></div>
                              <div><label className="text-[9px] text-gray-400 block">Vis Tasa de Def. %</label><input type="number" step="0.1" value={goalVR} onChange={(e) => setGoalVR(e.target.value)} className="bg-[#21262d] text-xs p-1 w-20 border border-gray-600 rounded text-white" /></div>
                            </div>
                          )}

                          <div className="w-full relative" style={{ height: '280px' }}>
                            <canvas ref={canvasRef} />
                            {!filtered.length && <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No hay datos filtrados</div>}
                          </div>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-gray-700 flex flex-col bg-[#161b22]">
                          <div className="p-2.5 bg-[#1c2128] border-b border-gray-700 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-300 tracking-wider uppercase"><Table2 className="inline h-3 w-3 mr-1" /> Matriz de Indicadores de Calidad de Alta Dirección</span>
                            <span className="text-[10px] text-amber-400 font-mono italic">Prioridad: Technotex 1 → Technotex 2 → EINS</span>
                          </div>
                          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-[#161b22] border-b border-gray-700 text-center text-[10px] tracking-wider text-gray-400 font-bold">
                                  <th colSpan={3} className="p-2 border-r border-gray-800 text-left text-cyan-400">IDENTIFICACIÓN</th>
                                  <th colSpan={3} className="p-2 border-r border-gray-800 bg-blue-950/20 text-blue-300">TOTAL FINAL (COMPILADO)</th>
                                  <th className="p-2 border-r border-gray-800 bg-emerald-950/20 text-emerald-300">MEDICIÓN</th>
                                  <th className="p-2 bg-amber-950/20 text-amber-300">CONTROL VISUAL</th>
                                </tr>
                                <tr className="bg-[#1c2128] text-[11px] border-b border-gray-700">
                                  <th className="p-2.5 font-medium text-left">Mes</th>
                                  <th className="p-2.5 font-medium text-left">Fábrica</th>
                                  <th className="p-2.5 font-medium text-left border-r border-gray-800">Comprador</th>
                                  <th className="p-2.5 text-right font-mono">No. de Auditoría</th>
                                  <th className="p-2.5 text-right font-mono">No. de Fallos</th>
                                  <th className="p-2.5 text-right font-mono border-r border-gray-800 text-blue-400">Tasa de Fallo(%)</th>
                                  <th className="p-2.5 text-right font-mono text-emerald-400 border-r border-gray-800">Tasa de Defecto(%)</th>
                                  <th className="p-2.5 text-right font-mono text-amber-400">Tasa de Defecto(%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800/60 bg-[#161b22]/50">
                                {(biData.rows as any[]).map((r: any, i: number) => (
                                  <tr key={i} className="hover:bg-gray-800/40 text-gray-300">
                                    <td className="p-2 font-medium text-gray-400">{r.mes}</td>
                                    <td className="p-2 font-bold text-white">{r.factory}</td>
                                    <td className="p-2 border-r border-gray-800">{r.buyer}</td>
                                    <td className="p-2 text-right font-mono">{r.audits.toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono text-red-400">{r.failures.toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono font-bold border-r border-gray-800 text-blue-400">{fmtPct(r.failures, r.audits)}</td>
                                    <td className="p-2 text-right font-mono font-bold border-r border-gray-800 text-emerald-400">{fmtPct(r.measDef, r.measIns)}</td>
                                    <td className="p-2 text-right font-mono font-bold text-amber-400">{fmtPct(r.visDef, r.visIns)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="border-t-2 border-amber-500 font-bold text-gray-100 bg-[#18202c] sticky bottom-0">
                                <tr className="text-white text-[12px]">
                                  <td colSpan={3} className="p-2.5 font-extrabold tracking-wider text-amber-400 border-r border-gray-800 uppercase">TOTAL ACUMULADO</td>
                                  <td className="p-2.5 text-right font-mono font-bold">{biData.totales.audits.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-red-400">{biData.totales.failures.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-mono font-extrabold text-blue-400 border-r border-gray-800">{fmtPct(biData.totales.failures, biData.totales.audits)}</td>
                                  <td className="p-2.5 text-right font-mono font-extrabold text-emerald-400 border-r border-gray-800">{fmtPct(biData.totales.measDef, biData.totales.measIns)}</td>
                                  <td className="p-2.5 text-right font-mono font-extrabold text-amber-400">{fmtPct(biData.totales.visDef, biData.totales.visIns)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
