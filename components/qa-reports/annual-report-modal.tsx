'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, FileSpreadsheet, Printer, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const FACTORY_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
  '#10b981', '#f43f5e', '#0284c7', '#7c3aed', '#ca8a04',
];

interface FactoryData {
  totalAudit: number;
  totalFail: number;
  measQty: number;
  measDef: number;
  visQty: number;
  visDef: number;
}

interface MonthlyData {
  month: number;
  records: number;
  totalAudit: number;
  totalFail: number;
  totalRate: string;
  measQty: number;
  measDef: number;
  measRate: string;
  visQty: number;
  visDef: number;
  visRate: string;
  factories: Record<string, FactoryData>;
}

interface AnnualReportModalProps {
  year: number;
  monthlyData: MonthlyData[];
  allFactories: string[];
  onClose: () => void;
}

function calcRate(def: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat(((def / total) * 100).toFixed(2));
}

export function AnnualReportModal({ year, monthlyData, allFactories, onClose }: AnnualReportModalProps) {
  const [selectedFactories, setSelectedFactories] = useState<string[]>(allFactories.length > 0 ? [allFactories[0]] : []);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartError, setChartError] = useState(false);

  const toggleFactory = (f: string) => {
    setSelectedFactories(prev => {
      if (prev.includes(f)) return prev.filter(x => x !== f);
      return [...prev, f];
    });
  };

  const months = monthlyData.map(m => MONTHS[m.month - 1]);

  const getFactoryData = (factoryName: string) => {
    return monthlyData.map(m => {
      const fd = m.factories[factoryName];
      if (!fd) return { failureRate: 0, oml: 0, oql: 0 };
      return {
        failureRate: calcRate(fd.totalFail, fd.totalAudit),
        oml: calcRate(fd.measDef, fd.measQty),
        oql: calcRate(fd.visDef, fd.visQty),
      };
    });
  };

  const getAggregatedData = () => {
    return monthlyData.map(m => ({
      failureRate: calcRate(m.totalFail, m.totalAudit),
      oml: calcRate(m.measDef, m.measQty),
      oql: calcRate(m.visDef, m.visQty),
    }));
  };

  // Build chart
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadChart = () => {
      if ((window as any).Chart) { setChartLoaded(true); return; }
      if (document.getElementById('chartjs-cdn')) {
        const check = setInterval(() => {
          if ((window as any).Chart) { clearInterval(check); setChartLoaded(true); }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'chartjs-cdn';
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
      script.onload = () => setChartLoaded(true);
      script.onerror = () => setChartError(true);
      document.head.appendChild(script);
    };
    loadChart();
  }, []);

  useEffect(() => {
    if (!chartLoaded || !chartRef.current) return;
    if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; }

    const datasets: any[] = [];

    if (selectedFactories.includes('__TOTAL__')) {
      const data = getAggregatedData();
      const color = '#ffffff';
      datasets.push(
        { label: `Total — Failure Rate %`, data: data.map(d => d.failureRate), borderColor: color, backgroundColor: color + '20', borderWidth: 3, borderDash: [8, 4], pointRadius: 4, pointHoverRadius: 6, tension: 0.3 },
        { label: `Total — OML %`, data: data.map(d => d.oml), borderColor: color, backgroundColor: color + '20', borderWidth: 3, borderDash: [8, 4], pointRadius: 4, pointHoverRadius: 6, tension: 0.3, hidden: true },
        { label: `Total — OQL %`, data: data.map(d => d.oql), borderColor: color, backgroundColor: color + '20', borderWidth: 3, borderDash: [8, 4], pointRadius: 4, pointHoverRadius: 6, tension: 0.3, hidden: true }
      );
    }

    selectedFactories.filter(f => f !== '__TOTAL__').forEach((factoryName, fi) => {
      const colorIdx = fi % FACTORY_COLORS.length;
      const color = FACTORY_COLORS[colorIdx];
      const data = getFactoryData(factoryName);
      const shortName = factoryName.length > 18 ? factoryName.slice(0, 16) + '…' : factoryName;
      datasets.push(
        { label: `${shortName} — Failure Rate %`, data: data.map(d => d.failureRate), borderColor: color, backgroundColor: color + '20', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.3 },
        { label: `${shortName} — OML %`, data: data.map(d => d.oml), borderColor: color, backgroundColor: color + '20', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, borderDash: [6, 3], hidden: true },
        { label: `${shortName} — OQL %`, data: data.map(d => d.oql), borderColor: color, backgroundColor: color + '20', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, borderDash: [3, 3], hidden: true }
      );
    });

    if (datasets.length === 0) return;

    chartInstanceRef.current = new (window as any).Chart(chartRef.current, {
      type: 'line',
      data: { labels: months, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#d1d5db', font: { size: 11 }, usePointStyle: true, pointStyle: 'line' }, position: 'bottom' },
          tooltip: { backgroundColor: '#1f2937', titleColor: '#f3f4f6', bodyColor: '#d1d5db', borderColor: '#374151', borderWidth: 1 }
        },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
          y: { min: 0, max: 100, ticks: { color: '#9ca3af', callback: (v: any) => v + '%' }, grid: { color: '#374151' } }
        }
      }
    });

    return () => { if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; } };
  }, [chartLoaded, selectedFactories, monthlyData]);

  const pct = (a: number, b: number) => b === 0 ? '0.00%' : ((a / b) * 100).toFixed(2) + '%';

  const buildTableRows = () => {
    const rows: { factory: string; month: string; failureRate: string; oml: string; oql: string }[] = [];
    selectedFactories.filter(f => f !== '__TOTAL__').forEach(factory => {
      monthlyData.forEach(m => {
        const fd = m.factories[factory];
        rows.push({
          factory,
          month: MONTHS_FULL[m.month - 1],
          failureRate: fd ? pct(fd.totalFail, fd.totalAudit) : '—',
          oml: fd ? pct(fd.measDef, fd.measQty) : '—',
          oql: fd ? pct(fd.visDef, fd.visQty) : '—',
        });
      });
    });
    return rows;
  };

  const handlePrint = () => {
    const rows = buildTableRows();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Anual QA ${year}</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#1a1a2e}
  h1{text-align:center;color:#0f3460;margin-bottom:4px;font-size:18px}
  h2{text-align:center;color:#16213e;font-size:12px;margin-top:0}
  .logo{text-align:center;margin-bottom:16px}.logo img{height:40px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}
  th{background:#0f3460;color:white;padding:6px 4px;border:1px solid #ddd;text-align:center}
  th:first-child,th:nth-child(2){text-align:left}
  td{padding:5px 4px;border:1px solid #ddd;text-align:center}
  td:first-child,td:nth-child(2){text-align:left;font-weight:bold}
  tr:nth-child(even){background:#f8f9fa}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#666}
  @media print{body{padding:10px}}
</style></head><body>
<div class="logo"><img src="/logo.png" alt="Logo"></div>
<h1>Reporte Anual de Calidad — ${year}</h1>
<h2>Generado el ${new Date().toLocaleDateString('es-NI')}</h2>
<table><thead><tr><th>Fábrica</th><th>Mes</th><th>Failure Rate %</th><th>OML %</th><th>OQL %</th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r.factory}</td><td>${r.month}</td><td>${r.failureRate}</td><td>${r.oml}</td><td>${r.oql}</td></tr>`).join('')}</tbody></table>
<div class="footer">Sistema de Control QA — Panel Administrativo</div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const handleExcel = () => {
    const rows = buildTableRows();
    const csv = ['Fábrica,Mes,Failure Rate %,OML %,OQL %', ...rows.map(r => `${r.factory},${r.month},${r.failureRate},${r.oml},${r.oql}`)].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Reporte_Anual_QA_${year}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleHTML = () => {
    const rows = buildTableRows();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Anual QA ${year}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#1a1a2e}
  .page{max-width:900px;margin:0 auto;padding:30px;background:white;min-height:100vh}
  .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #0f3460}
  .header img{height:50px;margin-bottom:10px}
  .header h1{color:#0f3460;font-size:20px}
  .header h2{color:#16213e;font-size:12px;font-weight:normal;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
  th{background:#0f3460;color:white;padding:8px 6px;border:1px solid #ddd;text-align:center}
  th:first-child,th:nth-child(2){text-align:left}
  td{padding:6px;border:1px solid #ddd;text-align:center}
  td:first-child,td:nth-child(2){text-align:left}
  tr:nth-child(even){background:#f8f9fa}
  tr:hover{background:#e8f4f8}
  .footer{margin-top:30px;text-align:center;font-size:10px;color:#999;padding-top:16px;border-top:1px solid #eee}
  @media print{.page{padding:15px}}
</style></head><body>
<div class="page">
<div class="header"><img src="/logo.png" alt="Logo"><h1>Reporte Anual de Calidad — ${year}</h1><h2>Generado el ${new Date().toLocaleDateString('es-NI')}</h2></div>
<table><thead><tr><th>Fábrica</th><th>Mes</th><th>Failure Rate %</th><th>OML %</th><th>OQL %</th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r.factory}</td><td>${r.month}</td><td>${r.failureRate}</td><td>${r.oml}</td><td>${r.oql}</td></tr>`).join('')}</tbody></table>
<div class="footer">Sistema de Control QA — Panel Administrativo</div></div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handlePowerBI = () => {
    const rows = buildTableRows();
    const factories = [...new Set(rows.map(r => r.factory))];
    const colorMap: Record<string, string> = {};
    factories.forEach((f, i) => { colorMap[f] = FACTORY_COLORS[i % FACTORY_COLORS.length]; });

    const datasetsJson = factories.map(f => {
      const c = colorMap[f];
      const fRows = rows.filter(r => r.factory === f);
      const frData = fRows.map(r => parseFloat(r.failureRate) || 0);
      const omlData = fRows.map(r => parseFloat(r.oml) || 0);
      const oqlData = fRows.map(r => parseFloat(r.oql) || 0);
      const sn = f.length > 16 ? f.slice(0, 14) + '…' : f;
      return `{label:'${sn} — Failure Rate',data:${JSON.stringify(frData)},borderColor:'${c}',backgroundColor:'${c}22',borderWidth:2,pointRadius:3,tension:0.3}
,{label:'${sn} — OML',data:${JSON.stringify(omlData)},borderColor:'${c}',backgroundColor:'${c}22',borderWidth:2,borderDash:[6,3],pointRadius:3,tension:0.3,hidden:true}
,{label:'${sn} — OQL',data:${JSON.stringify(oqlData)},borderColor:'${c}',backgroundColor:'${c}22',borderWidth:2,borderDash:[3,3],pointRadius:3,tension:0.3,hidden:true}`;
    }).join('\n');

    const tableRowsHtml = rows.map(r => {
      const frNum = parseFloat(r.failureRate) || 0;
      const omlNum = parseFloat(r.oml) || 0;
      const oqlNum = parseFloat(r.oql) || 0;
      return `<tr><td style="text-align:left">${r.factory}</td><td style="text-align:left">${r.month}</td><td>${r.failureRate}</td><td>${r.oml}</td><td>${r.oql}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Power BI — QA ${year}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#111827;color:#f3f4f6;padding:20px}
  .dashboard{max-width:1200px;margin:0 auto}
  .title{text-align:center;margin-bottom:24px}
  .title h1{color:#60a5fa;font-size:22px}
  .title h2{color:#9ca3af;font-size:13px;font-weight:normal}
  .chart-box{background:#1f2937;border-radius:12px;padding:20px;margin-bottom:20px}
  .chart-box h3{font-size:13px;color:#d1d5db;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151}
  .table-box{background:#1f2937;border-radius:12px;padding:20px}
  .table-box h3{font-size:13px;color:#d1d5db;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#374151;color:#d1d5db;padding:8px 6px;text-align:center}
  th:first-child,th:nth-child(2){text-align:left}
  td{padding:7px 6px;text-align:center;border-bottom:1px solid #374151}
  td:first-child,td:nth-child(2){text-align:left}
  tr:hover{background:#283548}
  .footer{text-align:center;font-size:10px;color:#6b7280;margin-top:20px}
</style></head><body>
<div class="dashboard">
<div class="title"><h1>Dashboard Anual de Calidad — ${year}</h1><h2>Failure Rate %, OML %, OQL % por Fábrica — Generado el ${new Date().toLocaleDateString('es-NI')}</h2></div>
<div class="chart-box"><h3>Línea de Tiempo por Fábrica</h3><div style="height:400px"><canvas id="timeline"></canvas></div></div>
<div class="table-box"><h3>Detalle por Fábrica y Mes</h3>
<table><thead><tr><th>Fábrica</th><th>Mes</th><th>Failure Rate %</th><th>OML %</th><th>OQL %</th></tr></thead>
<tbody>${tableRowsHtml}</tbody></table></div>
<div class="footer">Sistema de Control QA — Panel Administrativo</div>
</div>
<script>
const labels=${JSON.stringify(months)};
new Chart(document.getElementById('timeline'),{type:'line',data:{labels,datasets:[${datasetsJson}]}
,options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false}
,plugins:{legend:{labels:{color:'#d1d5db',font:{size:11},usePointStyle:true,pointStyle:'line'},position:'bottom'}
,tooltip:{backgroundColor:'#1f2937',titleColor:'#f3f4f6',bodyColor:'#d1d5db',borderColor:'#374151',borderWidth:1}}
,scales:{x:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}},y:{min:0,max:100,ticks:{color:'#9ca3af',callback:v=>v+'%'},grid:{color:'#374151'}}}}});
<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-7xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Reporte Anual — {year}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{monthlyData.length} mes(es) — {allFactories.length} fábrica(s)</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Factory selector */}
        <div className="px-6 pt-4 pb-2 border-b border-border/50 shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Selecciona fábricas para la gráfica:</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedFactories.includes('__TOTAL__') ? 'bg-white text-gray-900 border-white' : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'}`}
              onClick={() => {
                setSelectedFactories(prev =>
                  prev.includes('__TOTAL__') ? prev.filter(x => x !== '__TOTAL__') : [...prev, '__TOTAL__']
                );
              }}
            >Total General</button>
            {allFactories.map((f, i) => {
              const color = FACTORY_COLORS[i % FACTORY_COLORS.length];
              const active = selectedFactories.includes(f);
              return (
                <button
                  key={f}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors`}
                  style={active ? { backgroundColor: color, borderColor: color, color: '#fff' } : { borderColor: color + '66', color: color }}
                  onClick={() => toggleFactory(f)}
                >{f}</button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {chartError ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No se pudieron cargar las gráficas. Verifica tu conexión a internet.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/5 p-4 mb-6">
              <div style={{ height: '350px' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          )}

          {/* Data table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/10 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Detalle por Fábrica y Mes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-3 py-2 text-left text-white">Fábrica</th>
                    <th className="px-3 py-2 text-left text-white">Mes</th>
                    <th className="px-3 py-2 text-red-300">Failure Rate %</th>
                    <th className="px-3 py-2 text-amber-300">OML %</th>
                    <th className="px-3 py-2 text-violet-300">OQL %</th>
                  </tr>
                </thead>
                <tbody>
                  {buildTableRows().map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                      <td className="px-3 py-2 font-medium text-foreground">{r.factory}</td>
                      <td className="px-3 py-2 text-foreground">{r.month}</td>
                      <td className="px-3 py-2 text-center">{r.failureRate}</td>
                      <td className="px-3 py-2 text-center">{r.oml}</td>
                      <td className="px-3 py-2 text-center">{r.oql}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint} className="border-border gap-2">
            <Printer className="h-4 w-4" /> PDF / Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcel} className="border-border gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={handleHTML} className="border-border gap-2">
            <Download className="h-4 w-4" /> HTML Imprimible
          </Button>
          <Button variant="outline" size="sm" onClick={handlePowerBI} className="border-border gap-2 bg-indigo-900/20 hover:bg-indigo-900/30 text-indigo-300 border-indigo-500/30">
            <BarChart3 className="h-4 w-4" /> Power BI Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
