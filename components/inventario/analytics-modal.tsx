'use client';

import { useState, useMemo } from 'react';
import { X, BarChart3, Download, Table2, FileDown, TrendingUp, PieChart as PieIcon, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
  BarChart, Bar, AreaChart, Area, ComposedChart, PieChart as RePieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type { QAOQLRecord, InLineDefectRecord, QAOQLDefectCatalogItem } from '@/lib/firebase';

interface Empleado { code: string; nombres: string; apellidos: string; }

interface AnalyticsModalProps {
  inlineRecords: QAOQLRecord[];
  defectRecords: InLineDefectRecord[];
  empleados: Empleado[];
  defectCatalogItems: QAOQLDefectCatalogItem[];
  onClose: () => void;
  isAdmin?: boolean;
}

function getAuditorName(code: string, empleados: Empleado[]): string {
  const e = empleados.find(e => e.code === code);
  if (e) return `${e.nombres} ${e.apellidos}`;
  return code;
}

const factories = ['TECHNOTEX #2', 'EINS', 'DASOLTEX SA'];
const buyers = ['Target', "Kohl's", 'Walmart', 'Carhartt'];
const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899'];
const CHART_TYPES = [
  { value: 'line', label: 'L\u00ednea' }, { value: 'bar', label: 'Barra' },
  { value: 'area', label: '\u00c1rea' }, { value: 'pie', label: 'Pastel' },
  { value: 'donut', label: 'Dona' }, { value: 'radar', label: 'Radar' },
  { value: 'composed', label: 'Combinada' }, { value: 'horizontalBar', label: 'Barra Horizontal' },
];
const X_AXIS_OPTIONS = [
  { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' },
  { value: 'factory', label: 'F\u00e1brica' }, { value: 'line', label: 'L\u00ednea' },
  { value: 'po', label: 'PO' }, { value: 'color', label: 'Color' },
  { value: 'buyer', label: 'Buyer' }, { value: 'auditor', label: 'Auditor' },
];
const INLINE_METRIC_OPTIONS = [
  { value: 'oqlPct', label: 'OQL %' }, { value: 'passRate', label: 'Pass Rate %' },
  { value: 'sample', label: 'Sample' }, { value: 'reject', label: 'Reject' },
  { value: 'approved', label: 'Approved' }, { value: 'count', label: 'Count' },
];
const DEFECT_METRIC_OPTIONS = [
  { value: 'total', label: 'Total Defectos' }, { value: 'count', label: 'Count' },
];

function getISOWeekNumber(d: Date): number {
  if (isNaN(d.getTime())) return 0;
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function computeWeek(dateStr: string): number {
  if (!dateStr) return 0;
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return getISOWeekNumber(new Date(+iso[1], +iso[2]-1, +iso[3]));
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return getISOWeekNumber(new Date(+dmy[3], +dmy[2]-1, +dmy[1]));
  return 0;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${parseInt(m[3], 10)} ${MONTH_NAMES[parseInt(m[2], 10) - 1]}`;
  return dateStr;
}

function formatMonth(dateStr: string): string {
  if (!dateStr) return '-';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[2]}. ${MONTH_NAMES[parseInt(m[2], 10) - 1]} ${m[1]}`;
  return dateStr;
}

function getFieldValue(r: any, field: string): string {
  if (field === 'date') return formatDate(r.inspectionDate);
  if (field === 'week') return `Week ${computeWeek(r.inspectionDate)}`;
  if (field === 'month') return formatMonth(r.inspectionDate);
  if (field === 'factory') return r.factory || 'N/A';
  if (field === 'line') return r.line || 'N/A';
  if (field === 'po') return r.po || 'N/A';
  if (field === 'color') return r.color || 'N/A';
  if (field === 'buyer') return r.buyer || 'N/A';
  if (field === 'auditor') return r.auditor || 'N/A';
  return String(r[field] ?? 'N/A');
}

function getMetricValue(r: any, metric: string): number {
  if (metric === 'oqlPct') return r.visualSample > 0 ? (Math.max(0, r.visualSample - r.visualReject) / r.visualSample) * 100 : 0;
  if (metric === 'passRate') return r.visualSample > 0 ? (r.visualReject / r.visualSample) * 100 : 0;
  if (metric === 'count') return 1;
  return r[metric] || 0;
}

function parseDateToTimestamp(val: string): number {
  if (!val) return 0;
  const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2]-1, +iso[3]).getTime();
  const dmy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(+dmy[3], +dmy[2]-1, +dmy[1]).getTime();
  return new Date(val).getTime() || 0;
}

function sortForExport(a: any, b: any) {
  const dateA = parseDateToTimestamp(a.inspectionDate);
  const dateB = parseDateToTimestamp(b.inspectionDate);
  if (dateA !== dateB) return dateA - dateB;
  const fields = ['factory', 'line', 'po', 'color', 'buyer'];
  for (const f of fields) {
    const va = (a[f] || '').toString().toLowerCase();
    const vb = (b[f] || '').toString().toLowerCase();
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

export function AnalyticsModal({ inlineRecords, defectRecords, empleados, defectCatalogItems, onClose, isAdmin }: AnalyticsModalProps) {
  const [tab, setTab] = useState<'inline' | 'defect' | 'pivot'>('inline');
  const [chartType, setChartType] = useState('line');
  const [chartXAxis, setChartXAxis] = useState('week');
  const [chartMetrics, setChartMetrics] = useState<string[]>(['oqlPct']);
  const [chartAgg, setChartAgg] = useState<'sum' | 'avg'>('avg');
  const [chartTitle, setChartTitle] = useState('');
  const [showDataLabels, setShowDataLabels] = useState(false);
  const [top3GroupBy, setTop3GroupBy] = useState('factory');
  const [pivotDataset, setPivotDataset] = useState<'inline' | 'defect'>('inline');
  const [pivotRows, setPivotRows] = useState('factory');
  const [pivotCols, setPivotCols] = useState('month');
  const [pivotValue, setPivotValue] = useState('sample');
  const [pivotAgg, setPivotAgg] = useState<'sum' | 'avg'>('sum');

  const toggleMetric = (m: string) => {
    setChartMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFactory, setFilterFactory] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterPo, setFilterPo] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const normalize = (v: string) => v.trim();

  const months = useMemo(() => {
    const map = new Map<string, string>();
    const add = (v: string) => {
      if (!v) return;
      const trimmed = v.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        const display = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        map.set(key, display);
      }
    };
    inlineRecords.forEach(r => add(r.month));
    defectRecords.forEach(r => add(r.month));
    return Array.from(map.values()).sort();
  }, [inlineRecords, defectRecords]);

  const lines = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.line && set.add(r.line.trim()));
    defectRecords.forEach(r => r.line && set.add(r.line.trim()));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const pos = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.po && set.add(r.po.trim()));
    defectRecords.forEach(r => r.po && set.add(r.po.trim()));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.color && set.add(r.color.trim()));
    defectRecords.forEach(r => r.color && set.add(r.color.trim()));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const buyerList = useMemo(() => {
    const set = new Set<string>();
    buyers.forEach(b => set.add(b));
    inlineRecords.forEach(r => r.buyer && set.add(r.buyer.trim()));
    defectRecords.forEach(r => r.buyer && set.add(r.buyer.trim()));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const matchField = (val: string | undefined, filter: string) => {
    if (!filter) return true;
    return (val || '').trim().toLowerCase() === filter.toLowerCase();
  };

  const filteredInline = useMemo(() => {
    return inlineRecords.filter(r => {
      if (!matchField(r.month, filterMonth)) return false;
      if (!matchField(r.factory, filterFactory)) return false;
      if (!matchField(r.line, filterLine)) return false;
      if (!matchField(r.po, filterPo)) return false;
      if (!matchField(r.color, filterColor)) return false;
      if (!matchField(r.buyer, filterBuyer)) return false;
      return true;
    }).sort(sortForExport);
  }, [inlineRecords, filterMonth, filterFactory, filterLine, filterPo, filterColor, filterBuyer]);

  const filteredDefect = useMemo(() => {
    return defectRecords.filter(r => {
      if (!matchField(r.month, filterMonth)) return false;
      if (!matchField(r.factory, filterFactory)) return false;
      if (!matchField(r.line, filterLine)) return false;
      if (!matchField(r.po, filterPo)) return false;
      if (!matchField(r.color, filterColor)) return false;
      if (!matchField(r.buyer, filterBuyer)) return false;
      return true;
    }).sort(sortForExport);
  }, [defectRecords, filterMonth, filterFactory, filterLine, filterPo, filterColor, filterBuyer]);

  // KPI metrics
  const inlineMetrics = useMemo(() => {
    const totalSample = filteredInline.reduce((s, r) => s + (r.visualSample || 0), 0);
    const totalReject = filteredInline.reduce((s, r) => s + (r.visualReject || 0), 0);
    const totalApproved = filteredInline.reduce((s, r) => s + (r.visualApproved || 0), 0);
    const avgOQL = totalSample > 0 ? (totalReject / totalSample) * 100 : 0;
    const avgPassRate = totalSample > 0 ? (totalApproved / totalSample) * 100 : 0;
    const perfCount = { Excellent: 0, Good: 0, 'Very Bad': 0 };
    filteredInline.forEach(r => {
      if (r.performanceOQL === 'Excellent') perfCount.Excellent++;
      else if (r.performanceOQL === 'Good') perfCount.Good++;
      else perfCount['Very Bad']++;
    });
    return { totalSample, totalReject, totalApproved, avgOQL, avgPassRate, perfCount, count: filteredInline.length };
  }, [filteredInline]);

  const defectMetrics = useMemo(() => {
    const totalDefect = filteredDefect.reduce((s, r) => s + (r.total || 0), 0);
    const defectByCode: Record<string, { code: string; desc: string; total: number }> = {};
    filteredDefect.forEach(r => {
      const code = r.defectCode || 'N/A';
      if (!defectByCode[code]) defectByCode[code] = { code, desc: r.defectDescription || r.defectCode || '', total: 0 };
      defectByCode[code].total += (r.total || 0);
    });
    return { totalDefect, defectByCode: Object.values(defectByCode).sort((a, b) => b.total - a.total), count: filteredDefect.length };
  }, [filteredDefect]);

  // Top 3 Defect analysis by group
  const top3Defects = useMemo(() => {
    const groupField = top3GroupBy === 'week' ? 'week' : top3GroupBy;
    const groups: Record<string, Record<string, { code: string; desc: string; total: number }>> = {};
    filteredDefect.forEach(r => {
      let groupKey: string;
      if (top3GroupBy === 'month') groupKey = r.month || 'N/A';
      else if (top3GroupBy === 'week') groupKey = `Week ${computeWeek(r.inspectionDate) || 0}`;
      else groupKey = String((r as any)[groupField] || 'N/A').trim();
      if (!groupKey) groupKey = 'N/A';
      if (!groups[groupKey]) groups[groupKey] = {};
      const code = r.defectCode || 'N/A';
      if (!groups[groupKey][code]) groups[groupKey][code] = { code, desc: r.defectDescription || code, total: 0 };
      groups[groupKey][code].total += (r.total || 0);
    });
    const result: Array<{ group: string; top3: Array<{ code: string; desc: string; total: number }> }> = [];
    for (const [group, defects] of Object.entries(groups)) {
      const sorted = Object.values(defects).sort((a, b) => b.total - a.total).slice(0, 3);
      result.push({ group, top3: sorted });
    }
    const groupOrder = top3GroupBy === 'month'
      ? result.sort((a, b) => {
          const ma = parseInt(a.group); const mb = parseInt(b.group);
          return (isNaN(ma) ? a.group.localeCompare(b.group) : ma - mb);
        })
      : result.sort((a, b) => a.group.localeCompare(b.group));
    return groupOrder;
  }, [filteredDefect, top3GroupBy]);

  // Dynamic chart data transformation
  const sourceData = tab === 'inline' ? filteredInline : filteredDefect;
  const metricOptions = tab === 'inline' ? INLINE_METRIC_OPTIONS : DEFECT_METRIC_OPTIONS;

  const chartData = useMemo(() => {
    const groups: Record<string, any> = {};
    sourceData.forEach(r => {
      const key = getFieldValue(r, chartXAxis);
      if (!groups[key]) {
        const base: any = { name: key };
        chartMetrics.forEach(m => { base[m] = 0; });
        groups[key] = base;
      }
      chartMetrics.forEach(m => {
        groups[key][m] += getMetricValue(r, m);
      });
    });
    let result = Object.values(groups);
    if (chartAgg === 'avg') {
      const counts: Record<string, number> = {};
      sourceData.forEach(r => {
        const key = getFieldValue(r, chartXAxis);
        counts[key] = (counts[key] || 0) + 1;
      });
      result = result.map((g: any) => {
        const c: any = { name: g.name };
        chartMetrics.forEach(m => { c[m] = +(g[m] / (counts[g.name] || 1)).toFixed(2); });
        return c;
      });
    }
    // Sort numeric keys naturally
    return result.sort((a: any, b: any) => {
      const na = parseFloat(a.name.replace('#', ''));
      const nb = parseFloat(b.name.replace('#', ''));
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [sourceData, chartXAxis, chartMetrics, chartAgg]);

  // Pivot Table data
  const pivotTableData = useMemo(() => {
    const source = pivotDataset === 'inline' ? filteredInline : filteredDefect;
    const valKey = pivotValue;
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    source.forEach(r => {
      const rv = getFieldValue(r, pivotRows);
      const cv = getFieldValue(r, pivotCols);
      if (rv) rowSet.add(rv);
      if (cv) colSet.add(cv);
    });
    const rowValues = Array.from(rowSet).sort((a, b) => {
      const na = parseFloat(a.replace('#', '')); const nb = parseFloat(b.replace('#', ''));
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    });
    const colValues = Array.from(colSet).sort((a, b) => {
      const na = parseFloat(a.replace('#', '')); const nb = parseFloat(b.replace('#', ''));
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    });

    const cells: Record<string, Record<string, { sum: number; count: number }>> = {};
    source.forEach(r => {
      const rv = getFieldValue(r, pivotRows);
      const cv = getFieldValue(r, pivotCols);
      if (!rv || !cv) return;
      if (!cells[rv]) cells[rv] = {};
      if (!cells[rv][cv]) cells[rv][cv] = { sum: 0, count: 0 };
      let val = 0;
      const rec = r as any;
      if (valKey === 'count') val = 1;
      else if (valKey === 'sample') val = rec.visualSample || 0;
      else if (valKey === 'reject') val = rec.visualReject || 0;
      else if (valKey === 'approved') val = rec.visualApproved || 0;
      else if (valKey === 'oqlPct') val = rec.visualSample > 0 ? (Math.max(0, rec.visualSample - rec.visualReject) / rec.visualSample) * 100 : 0;
      else if (valKey === 'passRate') val = rec.visualSample > 0 ? (rec.visualReject / rec.visualSample) * 100 : 0;
      else if (valKey === 'total') val = rec.total || 0;
      cells[rv][cv].sum += val;
      cells[rv][cv].count++;
    });

    const getCell = (rv: string, cv: string) => {
      const cell = cells[rv]?.[cv];
      if (!cell) return 0;
      return pivotAgg === 'avg' ? +(cell.sum / cell.count).toFixed(2) : cell.sum;
    };

    const rowTotals: Record<string, number> = {};
    rowValues.forEach(rv => { rowTotals[rv] = +colValues.reduce((s, cv) => s + getCell(rv, cv), 0).toFixed(2); });
    const colTotals: Record<string, number> = {};
    colValues.forEach(cv => { colTotals[cv] = +rowValues.reduce((s, rv) => s + getCell(rv, cv), 0).toFixed(2); });
    const grandTotal = +rowValues.reduce((s, rv) => s + (rowTotals[rv] || 0), 0).toFixed(2);

    return { rowValues, colValues, getCell, rowTotals, colTotals, grandTotal, sourceLen: source.length };
  }, [pivotDataset, pivotRows, pivotCols, pivotValue, pivotAgg, filteredInline, filteredDefect]);

  // Render dynamic chart
  const renderChart = () => {
    if (chartMetrics.length === 0 || chartData.length === 0) {
      return <div className="py-8 text-center text-muted-foreground">Selecciona al menos una m\u00e9trica para graficar.</div>;
    }

    const isPieOrDonut = chartType === 'pie' || chartType === 'donut';
    const isRadar = chartType === 'radar';
    const isHorizontal = chartType === 'horizontalBar';

    if (isPieOrDonut) {
      const metric = chartMetrics[0];
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={chartType === 'donut' ? 50 : 0} outerRadius={100} dataKey={metric} nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {chartData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center gap-1">
            {chartData.map((d: any, i: number) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-muted-foreground">{d.name}: <strong>{d[metric]}</strong></span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (isRadar) {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <PolarRadiusAxis angle={30} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            {chartMetrics.map((m, i) => (
              <Radar key={m} name={metricOptions.find(o => o.value === m)?.label || m} dataKey={m} stroke={PIE_COLORS[i % PIE_COLORS.length]} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.2} />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (isHorizontal) {
      return (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 35)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={70} />
            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chartMetrics.map((m, i) => (
              <Bar key={m} dataKey={m} name={metricOptions.find(o => o.value === m)?.label || m} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[0, 2, 2, 0]}>
                {showDataLabels && <LabelList dataKey={m} position="right" fontSize={10} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'composed') {
      const barMetrics = chartMetrics.slice(0, 1);
      const lineMetrics = chartMetrics.slice(1);
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            {lineMetrics.length > 0 && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />}
            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {barMetrics.map((m, i) => (
              <Bar key={m} yAxisId="left" dataKey={m} name={metricOptions.find(o => o.value === m)?.label || m} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[2, 2, 0, 0]}>
                {showDataLabels && <LabelList dataKey={m} position="top" fontSize={10} />}
              </Bar>
            ))}
            {lineMetrics.map((m, i) => (
              <Line key={m} yAxisId="right" type="monotone" dataKey={m} name={metricOptions.find(o => o.value === m)?.label || m} stroke={PIE_COLORS[(barMetrics.length + i) % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }}>
                {showDataLabels && <LabelList dataKey={m} position="top" fontSize={10} />}
              </Line>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // Line, Bar, Area
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chartMetrics.map((m, i) => (
              <Line key={m} type="monotone" dataKey={m} name={metricOptions.find(o => o.value === m)?.label || m} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }}>
                {showDataLabels && <LabelList dataKey={m} position="top" fontSize={10} />}
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chartMetrics.map((m, i) => (
              <Bar key={m} dataKey={m} name={metricOptions.find(o => o.value === m)?.label || m} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[2, 2, 0, 0]}>
                {showDataLabels && <LabelList dataKey={m} position="top" fontSize={10} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chartMetrics.map((m, i) => (
              <Area key={m} type="monotone" dataKey={m} name={metricOptions.find(o => o.value === m)?.label || m} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.2} strokeWidth={2}>
                {showDataLabels && <LabelList dataKey={m} position="top" fontSize={10} />}
              </Area>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  // ─── HTML export functions ───
  const generateInlineHTML = () => {
    const header = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'OQL %', 'Performance', 'Pass Rate %'];
    if (isAdmin) header.push('Created By');
    const rows = filteredInline.map(r => {
      const perfClass = r.performanceOQL === 'Very Bad' ? 'perf-vbad' : r.performanceOQL === 'Excellent' ? 'perf-excellent' : 'perf-good';
      const oqlPct = r.visualSample > 0 ? ((Math.max(0, r.visualSample - r.visualReject) / r.visualSample) * 100).toFixed(2) : '0.00';
      const oqlClass = r.performanceOQL === 'Very Bad' ? 'perf-vbad' : r.performanceOQL === 'Excellent' ? 'perf-excellent' : '';
      const row = [
        r.item, formatDate(r.inspectionDate), `Week ${computeWeek(r.inspectionDate)}`, formatMonth(r.inspectionDate),
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.visualSample, r.visualReject, r.visualApproved,
        `<span class="${oqlClass}">${oqlPct}%</span>`,
        `<span class="${perfClass}">${r.performanceOQL}</span>`,
        (r.visualSample > 0 ? ((r.visualReject / r.visualSample) * 100).toFixed(2) : '0.00') + '%',
      ];
      if (isAdmin) row.push(r.createdBy || '');
      return row;
    });
    return { header, rows };
  };

  const generateDefectHTML = () => {
    const header = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Defecto', 'Total', 'C\u00f3digo Defecto', 'Descripci\u00f3n', 'CAT EN', 'ACR', 'Defect CAT EN', 'Descripci\u00f3n Defecto', 'CAT ES', 'ACR S', 'Defect CAT ES'];
    const rows = filteredDefect.map(r => [
      r.item, formatDate(r.inspectionDate), `Week ${computeWeek(r.inspectionDate)}`, formatMonth(r.inspectionDate),
      r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
      getAuditorName(r.auditor, empleados), r.style || '',
      r.defect || '', r.total, r.defectCode,
      r.defectDescription || '', r.catEnglish || '', r.acr || '',
      r.defectCatEnglish || '', r.descripcionDefecto || '',
      r.catEspanol || '', r.acrSpanish || '', r.defectCatSpanish || ''
    ]);
    return { header, rows };
  };

  // ─── Excel export with ExcelJS ───
  const inlineHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'OQL %', 'Performance', 'Pass Rate %'];
  const defectHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Defecto', 'Total', 'C\u00f3digo Defecto', 'Descripci\u00f3n', 'CAT EN', 'ACR', 'Defect CAT EN', 'Descripci\u00f3n Defecto', 'CAT ES', 'ACR S', 'Defect CAT ES'];

  const headerStyle = {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1A56DB' } },
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const, color: { argb: 'FF1A56DB' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF1A56DB' } },
      left: { style: 'thin' as const, color: { argb: 'FF1A56DB' } },
      right: { style: 'thin' as const, color: { argb: 'FF1A56DB' } },
    },
  };

  const cellBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
  };

  const centerAlign = { horizontal: 'center' as const, vertical: 'center' as const };

  const performanceStyles: Record<string, { fill: string; font: string }> = {
    'Very Bad': { fill: 'FFFECACA', font: 'FFDC2626' },
    'Good': { fill: 'FFFEF08A', font: 'FFCA8A04' },
    'Excellent': { fill: 'FFBBF7D0', font: 'FF16A34A' },
  };

  const buildInlineSheet = (ws: any, headerRow: number) => {
    const hRow = ws.getRow(headerRow);
    inlineHeader.forEach((h, i) => { ws.getCell(headerRow, i + 1).value = h; });
    hRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.fill = headerStyle.fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });
    hRow.height = 22;

    filteredInline.forEach((r, idx) => {
      const rowNum = headerRow + 1 + idx;
      const values = [
        r.item, formatDate(r.inspectionDate), `Week ${computeWeek(r.inspectionDate)}`, formatMonth(r.inspectionDate),
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.visualSample, r.visualReject, r.visualApproved,
        (r.visualSample > 0 ? ((Math.max(0, r.visualSample - r.visualReject) / r.visualSample) * 100).toFixed(2) : '0.00') + '%',
        r.performanceOQL,
        (r.visualSample > 0 ? ((r.visualReject / r.visualSample) * 100).toFixed(2) : '0.00') + '%'
      ];
      const row = ws.getRow(rowNum);
      values.forEach((v, ci) => {
        const cell = ws.getCell(rowNum, ci + 1);
        cell.value = v;
        cell.alignment = centerAlign;
      });
      row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = cellBorder; });

      const perf = r.performanceOQL || '';
      if (performanceStyles[perf]) {
        [15, 16].forEach(col => {
          const cell = ws.getCell(rowNum, col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: performanceStyles[perf].fill } };
          cell.font = { ...cell.font, color: { argb: performanceStyles[perf].font }, bold: true };
        });
      }
      row.height = 18;
    });

    const colWidths = [10, 13, 8, 12, 16, 8, 14, 10, 12, 22, 14, 10, 10, 10, 10, 14, 12, 14];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.autoFilter = { from: { row: headerRow, col: 1 }, to: { row: headerRow + filteredInline.length, col: inlineHeader.length } };
  };

  const buildDefectSheet = (ws: any, headerRow: number) => {
    const hRow = ws.getRow(headerRow);
    defectHeader.forEach((h, i) => { ws.getCell(headerRow, i + 1).value = h; });
    hRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.fill = headerStyle.fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });
    hRow.height = 22;

    filteredDefect.forEach((r, idx) => {
      const rowNum = headerRow + 1 + idx;
      const values = [
        r.item, formatDate(r.inspectionDate), `Week ${computeWeek(r.inspectionDate)}`, formatMonth(r.inspectionDate),
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.defect || '', r.total, r.defectCode,
        r.defectDescription || '', r.catEnglish || '', r.acr || '',
        r.defectCatEnglish || '', r.descripcionDefecto || '',
        r.catEspanol || '', r.acrSpanish || '', r.defectCatSpanish || ''
      ];
      values.forEach((v, ci) => {
        const cell = ws.getCell(rowNum, ci + 1);
        cell.value = v;
        cell.alignment = centerAlign;
      });
      const row = ws.getRow(rowNum);
      row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = cellBorder; });
      if (idx % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
      row.height = 18;
    });

    const colWidths = [10, 13, 8, 12, 16, 8, 14, 10, 12, 22, 14, 14, 8, 14, 20, 14, 10, 18, 22, 14, 10, 18];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.autoFilter = { from: { row: headerRow, col: 1 }, to: { row: headerRow + filteredDefect.length, col: defectHeader.length } };
  };

  const exportStyledExcel = async (type: 'inline' | 'defect' | 'both') => {
    const dateStr = new Date().toISOString().split('T')[0];
    try {
      const mod = await import('exceljs');
      const ExcelJS = mod.default || mod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QA Analytics';
      workbook.created = new Date();

      if (type === 'inline' || type === 'both') {
        const ws = workbook.addWorksheet('IN LINE', { views: [{ state: 'frozen', ySplit: 1 }] });
        buildInlineSheet(ws, 1);
      }
      if (type === 'defect' || type === 'both') {
        const ws = workbook.addWorksheet('In Line Defect', { views: [{ state: 'frozen', ySplit: 1 }] });
        buildDefectSheet(ws, 1);
      }

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `QA_Report_${dateStr}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ExcelJS export failed, falling back:', err);
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      if (type === 'inline' || type === 'both') {
        const data = filteredInline.map(r => inlineHeader.map(h => (r as any)[h] || ''));
        const ws = XLSX.utils.aoa_to_sheet([inlineHeader, ...data]);
        ws['!cols'] = inlineHeader.map(() => ({ wch: 14 }));
        XLSX.utils.book_append_sheet(wb, ws, 'IN LINE');
      }
      if (type === 'defect' || type === 'both') {
        const data = filteredDefect.map(r => defectHeader.map(h => (r as any)[h] || ''));
        const ws = XLSX.utils.aoa_to_sheet([defectHeader, ...data]);
        ws['!cols'] = defectHeader.map(() => ({ wch: 14 }));
        XLSX.utils.book_append_sheet(wb, ws, 'In Line Defect');
      }
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `QA_Report_${dateStr}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-xl border border-border bg-card max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Analytics Dashboard</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} className="border-green-500 text-green-500 hover:bg-green-500/10">
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Filters */}
          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Table2 className="h-3 w-3" /> Filtros
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Month</label>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                  <option value="">Todos</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Factory</label>
                <select value={filterFactory} onChange={e => setFilterFactory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                  <option value="">Todas</option>
                  {factories.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Line</label>
                <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                  <option value="">Todas</option>
                  {lines.map(l => <option key={l} value={l}>{l || '(sin l\u00ednea)'}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">PO</label>
                <select value={filterPo} onChange={e => setFilterPo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                  <option value="">Todos</option>
                  {pos.map(p => <option key={p} value={p}>{p || '(sin PO)'}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Color</label>
                <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                  <option value="">Todos</option>
                  {colors.map(c => <option key={c} value={c}>{c || '(sin color)'}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Buyer</label>
                <select value={filterBuyer} onChange={e => setFilterBuyer(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
                  <option value="">Todos</option>
                  {buyerList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
                onClick={() => { setFilterMonth(''); setFilterFactory(''); setFilterLine(''); setFilterPo(''); setFilterColor(''); setFilterBuyer(''); }}>
                Limpiar filtros
              </Button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-4 border-b border-border">
            <button onClick={() => setTab('inline')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${tab === 'inline' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              IN LINE ({filteredInline.length})
            </button>
            <button onClick={() => setTab('defect')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${tab === 'defect' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              In Line Defect ({filteredDefect.length})
            </button>
            <button onClick={() => setTab('pivot')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${tab === 'pivot' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Table2 className="h-4 w-4" /> Tabla Din\u00e1mica
            </button>
          </div>

          {/* IN LINE Dashboard */}
          {tab === 'inline' && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{inlineMetrics.count}</div>
                  <div className="text-xs text-muted-foreground">Total Records</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{inlineMetrics.totalSample}</div>
                  <div className="text-xs text-muted-foreground">Total Sample</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className={`text-2xl font-bold ${inlineMetrics.avgOQL <= 3 ? 'text-green-500' : inlineMetrics.avgOQL <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {inlineMetrics.avgOQL.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg OQL %</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">{inlineMetrics.avgPassRate.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground">Avg Pass Rate</div>
                </div>
              </div>

              {/* Chart Builder */}
              <div className="rounded-lg border border-border bg-muted/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" /> Constructor de Gr\u00e1ficas
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
                    <select value={chartType} onChange={e => setChartType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      {CHART_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Eje X</label>
                    <select value={chartXAxis} onChange={e => setChartXAxis(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      {X_AXIS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Agregaci\u00f3n</label>
                    <select value={chartAgg} onChange={e => setChartAgg(e.target.value as 'sum' | 'avg')}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      <option value="avg">Promedio</option>
                      <option value="sum">Suma</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">M\u00e9tricas</label>
                    <div className="flex flex-wrap gap-1">
                      {metricOptions.map(opt => (
                        <button key={opt.value} onClick={() => toggleMetric(opt.value)}
                          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            chartMetrics.includes(opt.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-muted-foreground">T\u00edtulo de la gr\u00e1fica</label>
                    <input type="text" value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                      placeholder="Ej: OQL % por Semana"
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showDataLabels} onChange={e => setShowDataLabels(e.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary" />
                      <span className="text-xs text-muted-foreground">Etiquetas</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Chart */}
              {chartData.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" /> {CHART_TYPES.find(ct => ct.value === chartType)?.label} por {X_AXIS_OPTIONS.find(o => o.value === chartXAxis)?.label}
                  </div>
                  {chartTitle && (
                    <h4 className="mb-3 text-center text-base font-bold text-foreground">{chartTitle}</h4>
                  )}
                  {renderChart()}
                </div>
              )}

              {/* Data Table */}
              {filteredInline.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border rounded-lg border-border">
                  No hay registros IN LINE con los filtros actuales.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/10 border-b border-border">
                        <th className="p-2 text-left font-medium text-primary">ITEM</th>
                        <th className="p-2 text-left font-medium text-primary">Date</th>
                        <th className="p-2 text-left font-medium text-primary">Week</th>
                        <th className="p-2 text-left font-medium text-primary">Month</th>
                        <th className="p-2 text-left font-medium text-primary">Factory</th>
                        <th className="p-2 text-left font-medium text-primary">Line</th>
                        <th className="p-2 text-left font-medium text-primary">PO</th>
                        <th className="p-2 text-left font-medium text-primary">Color</th>
                        <th className="p-2 text-left font-medium text-primary">Buyer</th>
                        <th className="p-2 text-left font-medium text-primary">Auditor</th>
                        <th className="p-2 text-left font-medium text-primary">Style</th>
                        <th className="p-2 text-left font-medium text-primary">Sample</th>
                        <th className="p-2 text-left font-medium text-primary">Reject</th>
                        <th className="p-2 text-left font-medium text-primary">Approved</th>
                        <th className="p-2 text-left font-medium text-primary">OQL %</th>
                        <th className="p-2 text-left font-medium text-primary">Performance</th>
                        <th className="p-2 text-left font-medium text-primary">Pass Rate %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInline.map(r => (
                        <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                          <td className="p-2 font-medium">{r.item}</td>
                          <td className="p-2 text-xs">{formatDate(r.inspectionDate)}</td>
                          <td className="p-2 text-xs">Week {computeWeek(r.inspectionDate)}</td>
                          <td className="p-2 text-xs">{formatMonth(r.inspectionDate)}</td>
                          <td className="p-2 text-xs">{r.factory}</td>
                          <td className="p-2 text-xs">{r.line || '-'}</td>
                          <td className="p-2 text-xs">{r.po || '-'}</td>
                          <td className="p-2 text-xs">{r.color || '-'}</td>
                          <td className="p-2 text-xs">{r.buyer}</td>
                          <td className="p-2 text-xs">{getAuditorName(r.auditor, empleados)}</td>
                          <td className="p-2 text-xs">{r.style || '-'}</td>
                          <td className="p-2 text-xs">{r.visualSample}</td>
                          <td className="p-2 text-xs">{r.visualReject}</td>
                          <td className="p-2 text-xs">{r.visualApproved}</td>
                          <td className="p-2 text-xs">{r.visualSample > 0 ? `${((Math.max(0, r.visualSample - r.visualReject) / r.visualSample) * 100).toFixed(2)}%` : '0.00%'}</td>
                          <td className="p-2">
                            <span className={`text-xs font-bold ${r.performanceOQL === 'Excellent' ? 'text-green-500' : r.performanceOQL === 'Good' ? 'text-yellow-500' : 'text-red-500'}`}>{r.performanceOQL}</span>
                          </td>
                          <td className="p-2 text-xs">{r.visualSample > 0 ? `${((r.visualReject / r.visualSample) * 100).toFixed(2)}%` : '0.00%'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* In Line Defect Dashboard */}
          {tab === 'defect' && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{defectMetrics.count}</div>
                  <div className="text-xs text-muted-foreground">Total Records</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{defectMetrics.totalDefect}</div>
                  <div className="text-xs text-muted-foreground">Total Defects</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{defectMetrics.defectByCode.length}</div>
                  <div className="text-xs text-muted-foreground">Unique Defect Codes</div>
                </div>
              </div>

              {/* Chart Builder (Defect) */}
              <div className="rounded-lg border border-border bg-muted/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" /> Constructor de Gr\u00e1ficas
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
                    <select value={chartType} onChange={e => setChartType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      {CHART_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Eje X</label>
                    <select value={chartXAxis} onChange={e => setChartXAxis(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      {X_AXIS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Agregaci\u00f3n</label>
                    <select value={chartAgg} onChange={e => setChartAgg(e.target.value as 'sum' | 'avg')}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      <option value="avg">Promedio</option>
                      <option value="sum">Suma</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">M\u00e9tricas</label>
                    <div className="flex flex-wrap gap-1">
                      {metricOptions.map(opt => (
                        <button key={opt.value} onClick={() => toggleMetric(opt.value)}
                          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            chartMetrics.includes(opt.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <label className="mb-1 block text-xs text-muted-foreground">T\u00edtulo de la gr\u00e1fica</label>
                    <input type="text" value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                      placeholder="Ej: OQL % por Semana"
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showDataLabels} onChange={e => setShowDataLabels(e.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary" />
                      <span className="text-xs text-muted-foreground">Etiquetas</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Chart */}
              {chartData.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" /> {CHART_TYPES.find(ct => ct.value === chartType)?.label} por {X_AXIS_OPTIONS.find(o => o.value === chartXAxis)?.label}
                  </div>
                  {chartTitle && (
                    <h4 className="mb-3 text-center text-base font-bold text-foreground">{chartTitle}</h4>
                  )}
                  {renderChart()}
                </div>
              )}

              {/* Defect by Code Table */}
              {defectMetrics.defectByCode.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/10 border-b border-border">
                        <th className="p-2 text-left font-medium text-primary">C\u00f3digo Defecto</th>
                        <th className="p-2 text-left font-medium text-primary">Descripci\u00f3n</th>
                        <th className="p-2 text-right font-medium text-primary">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defectMetrics.defectByCode.map(d => (
                        <tr key={d.code} className="border-b border-border hover:bg-muted/20">
                          <td className="p-2 font-medium">{d.code}</td>
                          <td className="p-2 text-xs">{d.desc}</td>
                          <td className="p-2 text-right font-bold">{d.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top 3 Defects */}
              {top3Defects.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      Top 3 Defectos
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Agrupar por:</label>
                      <select value={top3GroupBy} onChange={e => setTop3GroupBy(e.target.value)}
                        className="rounded-lg border border-border bg-input px-2 py-1 text-xs text-foreground">
                        <option value="factory">F\u00e1brica</option>
                        <option value="line">L\u00ednea</option>
                        <option value="color">Color</option>
                        <option value="month">Mes</option>
                        <option value="week">Semana</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/10 border-b border-border">
                          <th className="p-2 text-left font-medium text-primary">{top3GroupBy === 'month' ? 'Mes' : top3GroupBy === 'week' ? 'Semana' : top3GroupBy === 'factory' ? 'F\u00e1brica' : top3GroupBy === 'line' ? 'L\u00ednea' : 'Color'}</th>
                          <th className="p-2 text-left font-medium text-primary">#1</th>
                          <th className="p-2 text-left font-medium text-primary">#2</th>
                          <th className="p-2 text-left font-medium text-primary">#3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top3Defects.map(d => (
                          <tr key={d.group} className="border-b border-border hover:bg-muted/20">
                            <td className="p-2 font-medium text-xs">{d.group}</td>
                            {[0, 1, 2].map(i => (
                              <td key={i} className="p-2 text-xs">
                                {d.top3[i] ? (
                                  <span>{d.top3[i].code} <span className="text-muted-foreground">({d.top3[i].total})</span></span>
                                ) : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Table */}
              {filteredDefect.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border rounded-lg border-border">
                  No hay registros In Line Defect con los filtros actuales.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/10 border-b border-border">
                        <th className="p-2 text-left font-medium text-primary">ITEM</th>
                        <th className="p-2 text-left font-medium text-primary">Date</th>
                        <th className="p-2 text-left font-medium text-primary">Week</th>
                        <th className="p-2 text-left font-medium text-primary">Month</th>
                        <th className="p-2 text-left font-medium text-primary">Factory</th>
                        <th className="p-2 text-left font-medium text-primary">Line</th>
                        <th className="p-2 text-left font-medium text-primary">PO</th>
                        <th className="p-2 text-left font-medium text-primary">Color</th>
                        <th className="p-2 text-left font-medium text-primary">Buyer</th>
                        <th className="p-2 text-left font-medium text-primary">Auditor</th>
                        <th className="p-2 text-left font-medium text-primary">Style</th>
                        <th className="p-2 text-left font-medium text-primary">Defecto</th>
                        <th className="p-2 text-left font-medium text-primary">Total</th>
                        <th className="p-2 text-left font-medium text-primary">C\u00f3digo Defecto</th>
                        <th className="p-2 text-left font-medium text-primary">Descripci\u00f3n</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDefect.map(r => (
                        <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                          <td className="p-2 font-medium">{r.item}</td>
                          <td className="p-2 text-xs">{formatDate(r.inspectionDate)}</td>
                          <td className="p-2 text-xs">Week {computeWeek(r.inspectionDate)}</td>
                          <td className="p-2 text-xs">{formatMonth(r.inspectionDate)}</td>
                          <td className="p-2 text-xs">{r.factory}</td>
                          <td className="p-2 text-xs">{r.line || '-'}</td>
                          <td className="p-2 text-xs">{r.po || '-'}</td>
                          <td className="p-2 text-xs">{r.color || '-'}</td>
                          <td className="p-2 text-xs">{r.buyer}</td>
                          <td className="p-2 text-xs">{getAuditorName(r.auditor, empleados)}</td>
                          <td className="p-2 text-xs">{r.style || '-'}</td>
                          <td className="p-2 text-xs">{r.defect || '-'}</td>
                          <td className="p-2 text-xs">{r.total}</td>
                          <td className="p-2 text-xs">{r.defectCode}</td>
                          <td className="p-2 text-xs">{r.defectDescription || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pivot Table Tab */}
          {tab === 'pivot' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Table2 className="h-4 w-4 text-primary" /> Tabla Din\u00e1mica
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Datos</label>
                    <select value={pivotDataset} onChange={e => {
                      const ds = e.target.value as 'inline' | 'defect';
                      setPivotDataset(ds);
                      if (ds === 'defect') setPivotValue('total');
                      if (ds === 'inline') setPivotValue('sample');
                    }}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      <option value="inline">IN LINE</option>
                      <option value="defect">In Line Defect</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Filas</label>
                    <select value={pivotRows} onChange={e => setPivotRows(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      <option value="factory">F\u00e1brica</option>
                      <option value="line">L\u00ednea</option>
                      <option value="month">Mes</option>
                      <option value="week">Semana</option>
                      <option value="buyer">Buyer</option>
                      <option value="color">Color</option>
                      <option value="auditor">Auditor</option>
                      <option value="po">PO</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Columnas</label>
                    <select value={pivotCols} onChange={e => setPivotCols(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      <option value="factory">F\u00e1brica</option>
                      <option value="line">L\u00ednea</option>
                      <option value="month">Mes</option>
                      <option value="week">Semana</option>
                      <option value="buyer">Buyer</option>
                      <option value="color">Color</option>
                      <option value="auditor">Auditor</option>
                      <option value="po">PO</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Valor</label>
                    <select value={pivotValue} onChange={e => setPivotValue(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      {pivotDataset === 'inline' ? (
                        <>
                          <option value="sample">Sample</option>
                          <option value="reject">Reject</option>
                          <option value="approved">Approved</option>
                          <option value="oqlPct">OQL %</option>
                          <option value="passRate">Pass Rate %</option>
                          <option value="count">Count</option>
                        </>
                      ) : (
                        <>
                          <option value="total">Total Defectos</option>
                          <option value="count">Count</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Agregaci\u00f3n</label>
                    <select value={pivotAgg} onChange={e => setPivotAgg(e.target.value as 'sum' | 'avg')}
                      className="w-full rounded-lg border border-border bg-input px-2 py-2 text-xs text-foreground">
                      <option value="sum">Suma</option>
                      <option value="avg">Promedio</option>
                    </select>
                  </div>
                </div>
              </div>

              {pivotTableData.rowValues.length > 0 && pivotTableData.colValues.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/10 border-b border-border">
                        <th className="sticky left-0 z-10 bg-primary/10 p-2 text-left font-medium text-primary min-w-[120px]">
                          {pivotRows.charAt(0).toUpperCase() + pivotRows.slice(1)} / {pivotCols.charAt(0).toUpperCase() + pivotCols.slice(1)}
                        </th>
                        {pivotTableData.colValues.map(cv => (
                          <th key={cv} className="p-2 text-right font-medium text-primary min-w-[90px]">{cv}</th>
                        ))}
                        <th className="p-2 text-right font-medium text-primary bg-primary/20 min-w-[80px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pivotTableData.rowValues.map(rv => (
                        <tr key={rv} className="border-b border-border hover:bg-muted/20">
                          <td className="sticky left-0 z-10 bg-card p-2 text-xs font-medium">{rv}</td>
                          {pivotTableData.colValues.map(cv => {
                            const val = pivotTableData.getCell(rv, cv);
                            const isOQL = pivotValue === 'oqlPct';
                            const cls = isOQL ? (
                              val <= 3 ? 'text-green-500' : val <= 5 ? 'text-yellow-500' : 'text-red-500'
                            ) : '';
                            return (
                              <td key={cv} className={`p-2 text-right text-xs ${cls}`}>{val}</td>
                            );
                          })}
                          <td className="p-2 text-right text-xs font-bold bg-muted/30">{pivotTableData.rowTotals[rv]}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary/5 border-t-2 border-primary/20">
                        <td className="sticky left-0 z-10 bg-primary/5 p-2 text-xs font-bold">Total</td>
                        {pivotTableData.colValues.map(cv => (
                          <td key={cv} className="p-2 text-right text-xs font-bold">{pivotTableData.colTotals[cv]}</td>
                        ))}
                        <td className="p-2 text-right text-xs font-bold bg-primary/10">{pivotTableData.grandTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border rounded-lg border-border">
                  No hay datos para la tabla din\u00e1mica con los filtros actuales.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Dialog */}
        {exportOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 60 }}>
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <h4 className="mb-4 text-base font-bold text-foreground">Exportar a Excel</h4>
              <p className="mb-4 text-xs text-muted-foreground">\u00bfQu\u00e9 datos deseas exportar?</p>
              <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline" onClick={() => { exportStyledExcel('inline'); setExportOpen(false); }}>
                  <FileDown className="mr-2 h-4 w-4 text-blue-500" /> Solo IN LINE ({filteredInline.length} registros)
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { exportStyledExcel('defect'); setExportOpen(false); }}>
                  <FileDown className="mr-2 h-4 w-4 text-orange-500" /> Solo In Line Defect ({filteredDefect.length} registros)
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { exportStyledExcel('both'); setExportOpen(false); }}>
                  <FileDown className="mr-2 h-4 w-4 text-green-500" /> Ambos (dos pesta\u00f1as)
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setExportOpen(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}