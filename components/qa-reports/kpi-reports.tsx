'use client';

import { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Clock, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { onValue, ref, db } from '@/lib/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  status: 'abierto' | 'en-progreso' | 'resuelto' | 'cerrado';
  reportedBy: string;
  date: string;
  resolvedAt?: string;
}

const severityColors = {
  baja: '#6b7280',
  media: '#3b82f6',
  alta: '#f97316',
  critica: '#ef4444',
};

const statusColors = {
  abierto: '#ef4444',
  'en-progreso': '#f59e0b',
  resuelto: '#22c55e',
  cerrado: '#6b7280',
};

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#6b7280', '#3b82f6', '#a855f7'];

function getMonthName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

export function KpiReports() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    const r = ref(db, 'qa-issues');
    const unsub = onValue(r, (snap) => {
      const raw: Record<string, Issue> = snap.val() || {};
      setIssues(Object.values(raw));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <Card className="mx-auto max-w-4xl border-primary/20 bg-card/95">
        <CardContent className="p-12 text-center text-muted-foreground">Cargando datos...</CardContent>
      </Card>
    );
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const filtered = issues.filter(i => i.date >= cutoffStr);

  const total = filtered.length;
  const openCount = filtered.filter(i => i.status === 'abierto').length;
  const resolvedCount = filtered.filter(i => i.status === 'resuelto' || i.status === 'cerrado').length;
  const inProgressCount = filtered.filter(i => i.status === 'en-progreso').length;

  const resolvedWithTime = filtered.filter(i => i.resolvedAt && i.date);
  const avgResolutionDays = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((sum, i) => {
        const start = new Date(i.date + 'T12:00:00').getTime();
        const end = new Date(i.resolvedAt! + 'T12:00:00').getTime();
        return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      }, 0) / resolvedWithTime.length)
    : 0;

  const bySeverity = ['baja', 'media', 'alta', 'critica'].map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: filtered.filter(i => i.severity === sev).length,
    fill: severityColors[sev as keyof typeof severityColors],
  }));

  const byStatus = [
    { name: 'Abierto', value: openCount, fill: statusColors.abierto },
    { name: 'En progreso', value: inProgressCount, fill: statusColors['en-progreso'] },
    { name: 'Resuelto', value: filtered.filter(i => i.status === 'resuelto').length, fill: statusColors.resuelto },
    { name: 'Cerrado', value: filtered.filter(i => i.status === 'cerrado').length, fill: statusColors.cerrado },
  ].filter(s => s.value > 0);

  const byMonth: Record<string, { total: number; abierto: number; resuelto: number }> = {};
  filtered.forEach(i => {
    const month = getMonthName(i.date);
    if (!byMonth[month]) byMonth[month] = { total: 0, abierto: 0, resuelto: 0 };
    byMonth[month].total++;
    if (i.status === 'abierto') byMonth[month].abierto++;
    if (i.status === 'resuelto' || i.status === 'cerrado') byMonth[month].resuelto++;
  });
  const trendData = Object.entries(byMonth)
    .sort(([a], [b]) => {
      const parse = (s: string) => {
        const [m, y] = s.split(' ');
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return parseInt('20' + y) * 12 + months.indexOf(m.slice(0, 3));
      };
      return parse(a) - parse(b);
    })
    .map(([month, data]) => ({ month, ...data }));

  const handleExportCSV = () => {
    const headers = 'Titulo,Severidad,Estado,Reportado por,Fecha,Resuelto el';
    const rows = filtered.map(i =>
      `"${i.title}","${i.severity}","${i.status}","${i.reportedBy}","${i.date}","${i.resolvedAt || ''}"`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const tileClass = "rounded-xl border border-border bg-card/80 p-6 backdrop-blur-sm";

  return (
    <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BarChart3 className="h-5 w-5" />
              KPI Reports
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {filtered.length} issues en los ultimos {months} meses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground"
            >
              <option value={3}>Ultimos 3 meses</option>
              <option value={6}>Ultimos 6 meses</option>
              <option value={12}>Ultimos 12 meses</option>
              <option value={99}>Todos</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className={tileClass}>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{total}</p>
                <p className="text-xs text-muted-foreground">Total Issues</p>
              </div>
            </div>
          </div>
          <div className={tileClass}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{openCount}</p>
                <p className="text-xs text-muted-foreground">Abiertos</p>
              </div>
            </div>
          </div>
          <div className={tileClass}>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground">Resueltos/Cerrados</p>
              </div>
            </div>
          </div>
          <div className={tileClass}>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{avgResolutionDays}d</p>
                <p className="text-xs text-muted-foreground">Tiempo promedio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Severity bar chart */}
          <div className="rounded-xl border border-border bg-card/80 p-4">
            <h3 className="mb-4 font-semibold text-foreground">Issues por Severidad</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                  {bySeverity.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie chart */}
          <div className="rounded-xl border border-border bg-card/80 p-4">
            <h3 className="mb-4 font-semibold text-foreground">Issues por Estado</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {byStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Trend line chart */}
          <div className="md:col-span-2 rounded-xl border border-border bg-card/80 p-4">
            <h3 className="mb-4 font-semibold text-foreground">Tendencia Mensual</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="abierto" name="Abiertos" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="resuelto" name="Resueltos" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
