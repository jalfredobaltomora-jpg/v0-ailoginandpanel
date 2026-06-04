'use client';

import { useState, useMemo } from 'react';
import { X, BarChart3, Download, Table2, FileDown, TrendingUp, PieChart as PieIcon, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
  BarChart, Bar, AreaChart, Area, ComposedChart, PieChart as RePieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type { QADHURecord, InLineDefectRecord, QADHUDefectCatalogItem } from '@/lib/firebase';

interface Empleado { code: string; nombres: string; apellidos: string; }

interface AnalyticsModalProps {
  inlineRecords: QADHURecord[];
  defectRecords: InLineDefectRecord[];
  empleados: Empleado[];
  defectCatalogItems: QADHUDefectCatalogItem[];
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
  { value: 'dhuPct', label: 'DHU %' }, { value: 'passRate', label: 'Pass Rate %' },
  { value: 'sample', label: 'Sample' }, { value: 'reject', label: 'Reject' },
  { value: 'approved', label: 'Approved' }, { value: 'count', label: 'Count' },
];
const DEFECT_METRIC_OPTIONS = [
  { value: 'total', label: 'Total Defectos' }, { value: 'count', label: 'Count' },
];

function getFieldValue(r: any, field: string): string {
  if (field === 'week') return `#${r.week || 0}`;
  if (field === 'month') return r.month || 'N/A';
  if (field === 'factory') return r.factory || 'N/A';
  if (field === 'line') return r.line || 'N/A';
  if (field === 'po') return r.po || 'N/A';
  if (field === 'color') return r.color || 'N/A';
  if (field === 'buyer') return r.buyer || 'N/A';
  if (field === 'auditor') return r.auditor || 'N/A';
  return String(r[field] ?? 'N/A');
}

function getMetricValue(r: any, metric: string): number {
  if (metric === 'dhuPct') return r.dhuScorePercent != null ? r.dhuScorePercent * 100 : 0;
  if (metric === 'passRate') return r.passRateScorePercent != null ? r.passRateScorePercent * 100 : 0;
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
  const [tab, setTab] = useState<'inline' | 'defect'>('inline');
  const [chartType, setChartType] = useState('line');
  const [chartXAxis, setChartXAxis] = useState('week');
  const [chartMetrics, setChartMetrics] = useState<string[]>(['dhuPct']);
  const [chartAgg, setChartAgg] = useState<'sum' | 'avg'>('avg');
  const [chartTitle, setChartTitle] = useState('');
  const [showDataLabels, setShowDataLabels] = useState(false);

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
    const avgDHU = totalSample > 0 ? (totalReject / totalSample) * 100 : 0;
    const avgPassRate = totalSample > 0 ? (totalApproved / totalSample) * 100 : 0;
    const perfCount = { Excellent: 0, Good: 0, 'Very Bad': 0 };
    filteredInline.forEach(r => {
      if (r.performanceDHU === 'Excellent') perfCount.Excellent++;
      else if (r.performanceDHU === 'Good') perfCount.Good++;
      else perfCount['Very Bad']++;
    });
    return { totalSample, totalReject, totalApproved, avgDHU, avgPassRate, perfCount, count: filteredInline.length };
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
    const header = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'DHU %', 'Performance', 'Pass Rate %'];
    if (isAdmin) header.push('Created By');
    const rows = filteredInline.map(r => {
      const perfClass = r.performanceDHU === 'Very Bad' ? 'perf-vbad' : r.performanceDHU === 'Excellent' ? 'perf-excellent' : 'perf-good';
      const dhuPct = (r.dhuScorePercent * 100).toFixed(2);
      const dhuClass = r.performanceDHU === 'Very Bad' ? 'perf-vbad' : r.performanceDHU === 'Excellent' ? 'perf-excellent' : '';
      const row = [
        r.item, r.inspectionDate, `#${r.week}`, r.month || '',
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.visualSample, r.visualReject, r.visualApproved,
        `<span class="${dhuClass}">${dhuPct}%</span>`,
        `<span class="${perfClass}">${r.performanceDHU}</span>`,
        (r.passRateScorePercent * 100).toFixed(2) + '%',
      ];
      if (isAdmin) row.push(r.createdBy || '');
      return row;
    });
    return { header, rows };
  };

  const generateDefectHTML = () => {
    const header = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Defecto', 'Total', 'C\u00f3digo Defecto', 'Descripci\u00f3n', 'CAT EN', 'ACR', 'Defect CAT EN', 'Descripci\u00f3n Defecto', 'CAT ES', 'ACR S', 'Defect CAT ES'];
    const rows = filteredDefect.map(r => [
      r.item, r.inspectionDate, `#${r.week}`, r.month || '',
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
  const inlineHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'DHU %', 'Performance', 'Pass Rate %'];
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
        r.item, r.inspectionDate, `#${r.week}`, r.month || '',
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.visualSample, r.visualReject, r.visualApproved,
        (r.dhuScorePercent * 100).toFixed(2) + '%',
        r.performanceDHU,
        (r.passRateScorePercent * 100).toFixed(2) + '%'
      ];
      const row = ws.getRow(rowNum);
      values.forEach((v, ci) => {
        const cell = ws.getCell(rowNum, ci + 1);
        cell.value = v;
        cell.alignment = centerAlign;
      });
      row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = cellBorder; });

      const perf = r.performanceDHU || '';
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
        r.item, r.inspectionDate, `#${r.week}`, r.month || '',
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

          {/* Sub-tabs for inline / defect */}
          <div className="flex gap-4 border-b border-border">
            <button onClick={() => setTab('inline')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${tab === 'inline' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              IN LINE ({filteredInline.length})
            </button>
            <button onClick={() => setTab('defect')}
              className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${tab === 'defect' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              In Line Defect ({filteredDefect.length})
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
                  <div className={`text-2xl font-bold ${inlineMetrics.avgDHU <= 3 ? 'text-green-500' : inlineMetrics.avgDHU <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {inlineMetrics.avgDHU.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg DHU %</div>
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
                      placeholder="Ej: DHU % por Semana"
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
                        <th className="p-2 text-left font-medium text-primary">DHU %</th>
                        <th className="p-2 text-left font-medium text-primary">Performance</th>
                        <th className="p-2 text-left font-medium text-primary">Pass Rate %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInline.map(r => (
                        <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                          <td className="p-2 font-medium">{r.item}</td>
                          <td className="p-2 text-xs">{r.inspectionDate}</td>
                          <td className="p-2 text-xs">#{r.week}</td>
                          <td className="p-2 text-xs">{r.month || '-'}</td>
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
                          <td className="p-2 text-xs">{(r.dhuScorePercent * 100).toFixed(2)}%</td>
                          <td className="p-2">
                            <span className={`text-xs font-bold ${r.performanceDHU === 'Excellent' ? 'text-green-500' : r.performanceDHU === 'Good' ? 'text-yellow-500' : 'text-red-500'}`}>{r.performanceDHU}</span>
                          </td>
                          <td className="p-2 text-xs">{(r.passRateScorePercent * 100).toFixed(2)}%</td>
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
                      placeholder="Ej: DHU % por Semana"
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
                          <td className="p-2 text-xs">{r.inspectionDate}</td>
                          <td className="p-2 text-xs">#{r.week}</td>
                          <td className="p-2 text-xs">{r.month || '-'}</td>
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