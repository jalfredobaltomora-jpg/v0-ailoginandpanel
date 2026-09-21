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

function pct(a: number, b: number): string {
  if (b === 0) return '0.00%';
  return ((a / b) * 100).toFixed(2) + '%';
}

export function AnnualReportModal({ year, monthlyData, allFactories, onClose }: AnnualReportModalProps) {
  const [selectedFactories, setSelectedFactories] = useState<string[]>(allFactories.length > 0 ? [allFactories[0]] : []);
  const [goalFR, setGoalFR] = useState('');
  const [goalOML, setGoalOML] = useState('');
  const [goalOQL, setGoalOQL] = useState('');
  const [labelPos, setLabelPos] = useState<'auto' | 'top' | 'bottom'>('auto');
  const chartFailureRef = useRef<HTMLCanvasElement>(null);
  const chartOmlRef = useRef<HTMLCanvasElement>(null);
  const chartOqlRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<any[]>([]);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartError, setChartError] = useState(false);

  const toggleFactory = (f: string) => {
    setSelectedFactories(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
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

  // Load Chart.js
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

  // Build 3 charts
  useEffect(() => {
    if (!chartLoaded) return;
    chartsRef.current.forEach(c => { if (c) c.destroy(); });
    chartsRef.current = [];

    const buildDatasets = (metric: 'failureRate' | 'oml' | 'oql') => {
      const datasets: any[] = [];

      if (selectedFactories.includes('__TOTAL__')) {
        const data = getAggregatedData();
        datasets.push({
          label: 'Total General',
          data: data.map(d => d[metric]),
          borderColor: '#ffffff',
          backgroundColor: '#ffffff22',
          borderWidth: 3,
          borderDash: [8, 4],
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          tension: 0.3,
        });
      }

      selectedFactories.filter(f => f !== '__TOTAL__').forEach((factoryName, fi) => {
        const color = FACTORY_COLORS[fi % FACTORY_COLORS.length];
        const data = getFactoryData(factoryName);
        const shortName = factoryName.length > 22 ? factoryName.slice(0, 20) + '…' : factoryName;
        datasets.push({
          label: shortName,
          data: data.map(d => d[metric]),
          borderColor: color,
          backgroundColor: color + '22',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          tension: 0.3,
        });
      });

      return datasets;
    };

    const makeChart = (canvas: HTMLCanvasElement | null, title: string, datasets: any[], goalValue?: number) => {
      if (!canvas || datasets.length === 0) return null;
      // Calculate Y max: highest value + ~15% buffer, min 5%, also consider goal
      let yMax = 0;
      datasets.forEach(ds => { ds.data.forEach((v: number) => { if (v > yMax) yMax = v; }); });
      if (goalValue !== undefined && goalValue > yMax) yMax = goalValue;
      if (yMax === 0) yMax = 5;
      const buffer = Math.max(yMax * 0.15, 0.5);
      yMax = Math.ceil((yMax + buffer) * 10) / 10;

      // Goal line plugin
      const goalLinePlugin = {
        id: 'goalLine',
        afterDatasetsDraw(chart: any) {
          if (goalValue === undefined || goalValue === null) return;
          const { ctx, chartArea, scales } = chart;
          const yPixel = scales.y.getPixelForValue(goalValue);
          if (yPixel < chartArea.top || yPixel > chartArea.bottom) return;
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([8, 4]);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.moveTo(chartArea.left, yPixel);
          ctx.lineTo(chartArea.right, yPixel);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`GOAL: ${goalValue}%`, chartArea.right, yPixel - 3);
          ctx.restore();
        },
      };

      // Datalabels plugin — configurable position with overlap avoidance
      const datalabelsPlugin = {
        id: 'qaDatalabels',
        afterDatasetsDraw(chart: any) {
          const { ctx } = chart;
          const placed: { x: number; y: number; w: number; h: number }[] = [];
          chart.data.datasets.forEach((ds: any, di: number) => {
            const meta = chart.getDatasetMeta(di);
            if (meta.hidden) return;
            const points = meta.data;
            points.forEach((point: any, i: number) => {
              const val = ds.data[i];
              const label = val.toFixed(1) + '%';
              ctx.save();
              ctx.font = 'bold 9px sans-serif';
              const tw = ctx.measureText(label).width;
              const th = 11;
              ctx.restore();

              let offsets: { dx: number; dy: number }[];
              if (labelPos === 'top') {
                offsets = [
                  { dx: 0, dy: -18 },
                  { dx: tw / 2 + 6, dy: -18 },
                  { dx: -(tw / 2 + 6), dy: -18 },
                  { dx: 0, dy: -26 },
                  { dx: tw / 2 + 6, dy: -26 },
                  { dx: -(tw / 2 + 6), dy: -26 },
                ];
              } else if (labelPos === 'bottom') {
                offsets = [
                  { dx: 0, dy: 18 },
                  { dx: tw / 2 + 6, dy: 18 },
                  { dx: -(tw / 2 + 6), dy: 18 },
                  { dx: 0, dy: 26 },
                  { dx: tw / 2 + 6, dy: 26 },
                  { dx: -(tw / 2 + 6), dy: 26 },
                ];
              } else {
                offsets = [
                  { dx: 0, dy: -18 },
                  { dx: 0, dy: 18 },
                  { dx: tw / 2 + 6, dy: -18 },
                  { dx: tw / 2 + 6, dy: 18 },
                  { dx: -(tw / 2 + 6), dy: -18 },
                  { dx: -(tw / 2 + 6), dy: 18 },
                  { dx: 0, dy: -26 },
                  { dx: 0, dy: 26 },
                ];
              }

              let bestX = point.x;
              let bestY = point.y - 18;
              for (const off of offsets) {
                const cx = point.x + off.dx;
                const cy = point.y + off.dy;
                const box = { x: cx - tw / 2, y: cy - th, w: tw, h: th + 2 };
                const collision = placed.some(p =>
                  box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y
                );
                if (!collision) { bestX = cx; bestY = cy; break; }
              }

              ctx.save();
              ctx.font = 'bold 9px sans-serif';
              ctx.fillStyle = ds.borderColor || '#fff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText(label, bestX, bestY);
              placed.push({ x: bestX - tw / 2, y: bestY - th, w: tw, h: th + 2 });
              ctx.restore();
            });
          });
        },
      };

      return new (window as any).Chart(canvas, {
        type: 'line',
        data: { labels: months, datasets },
        plugins: [datalabelsPlugin, goalLinePlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 20 } },
          plugins: {
            legend: {
              labels: { color: '#d1d5db', font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', padding: 16 },
              position: 'bottom',
            },
            title: {
              display: true,
              text: title,
              color: '#f3f4f6',
              font: { size: 14, weight: 'bold' },
              padding: { bottom: 12 },
            },
            tooltip: {
              backgroundColor: '#1f2937',
              titleColor: '#f3f4f6',
              bodyColor: '#d1d5db',
              borderColor: '#374151',
              borderWidth: 1,
              callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%` },
            },
          },
          scales: {
            x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
            y: {
              min: 0,
              max: yMax,
              ticks: { color: '#9ca3af', callback: (v: any) => v.toFixed(1) + '%', stepSize: yMax <= 10 ? 1 : yMax <= 30 ? 5 : undefined },
              grid: { color: '#374151' },
            },
          },
        },
      });
    };

    const frDS = buildDatasets('failureRate');
    const omlDS = buildDatasets('oml');
    const oqlDS = buildDatasets('oql');

    const timer = setTimeout(() => {
      const gFR = goalFR !== '' ? parseFloat(goalFR) : undefined;
      const gOML = goalOML !== '' ? parseFloat(goalOML) : undefined;
      const gOQL = goalOQL !== '' ? parseFloat(goalOQL) : undefined;
      chartsRef.current[0] = makeChart(chartFailureRef.current, 'Failure Rate %', frDS, gFR);
      chartsRef.current[1] = makeChart(chartOmlRef.current, 'OML % (Outbound Measurement Level)', omlDS, gOML);
      chartsRef.current[2] = makeChart(chartOqlRef.current, 'OQL % (Outbound Quality Level)', oqlDS, gOQL);
    }, 50);

    return () => {
      clearTimeout(timer);
      chartsRef.current.forEach(c => { if (c) c.destroy(); });
      chartsRef.current = [];
    };
  }, [chartLoaded, selectedFactories, monthlyData, goalFR, goalOML, goalOQL, labelPos]);

  const buildTableRows = () => {
    const rows: { factory: string; month: string; failureRate: string; oml: string; oql: string }[] = [];
    const factoriesToShow = selectedFactories.filter(f => f !== '__TOTAL__');
    if (factoriesToShow.length === 0) {
      monthlyData.forEach(m => {
        rows.push({
          factory: 'Total General',
          month: MONTHS_FULL[m.month - 1],
          failureRate: pct(m.totalFail, m.totalAudit),
          oml: pct(m.measDef, m.measQty),
          oql: pct(m.visDef, m.visQty),
        });
      });
    } else {
      factoriesToShow.forEach(factory => {
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
    }
    return rows;
  };

  const handlePrint = () => {
    const rows = buildTableRows();
    const frImg = chartFailureRef.current?.toDataURL('image/png') || '';
    const omlImg = chartOmlRef.current?.toDataURL('image/png') || '';
    const oqlImg = chartOqlRef.current?.toDataURL('image/png') || '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Anual QA ${year}</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#1a1a2e}
  h1{text-align:center;color:#0f3460;margin-bottom:4px;font-size:18px}
  h2{text-align:center;color:#16213e;font-size:12px;margin-top:0}
  h3{color:#0f3460;font-size:13px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .logo{text-align:center;margin-bottom:16px}.logo img{height:40px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
  th{background:#0f3460;color:white;padding:6px 4px;border:1px solid #ddd;text-align:center}
  th:first-child,th:nth-child(2){text-align:left}
  td{padding:5px 4px;border:1px solid #ddd;text-align:center}
  td:first-child,td:nth-child(2){text-align:left;font-weight:bold}
  tr:nth-child(even){background:#f8f9fa}
  .charts{margin-top:24px;page-break-before:always}
  .chart-img{width:100%;margin-bottom:16px}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#666}
  @media print{body{padding:10px}.charts{page-break-before:always}}
</style></head><body>
<div class="logo"><img src="/logo.png" alt="Logo"></div>
<h1>Reporte Anual de Calidad — ${year}</h1>
<h2>Generado el ${new Date().toLocaleDateString('es-NI')}</h2>
<h3>Detalle por Fábrica y Mes</h3>
<table><thead><tr><th>Fábrica</th><th>Mes</th><th>Failure Rate %</th><th>OML %</th><th>OQL %</th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r.factory}</td><td>${r.month}</td><td>${r.failureRate}</td><td>${r.oml}</td><td>${r.oql}</td></tr>`).join('')}</tbody></table>
<div class="charts">
  ${frImg ? `<h3>Failure Rate %</h3><img class="chart-img" src="${frImg}" />` : ''}
  ${omlImg ? `<h3>OML %</h3><img class="chart-img" src="${omlImg}" />` : ''}
  ${oqlImg ? `<h3>OQL %</h3><img class="chart-img" src="${oqlImg}" />` : ''}
</div>
<div class="footer">Sistema de Control QA — Panel Administrativo</div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const handleExcel = () => {
    const allRows: { factory: string; month: string; failureRate: string; oml: string; oql: string }[] = [];
    allFactories.forEach(factory => {
      monthlyData.forEach(m => {
        const fd = m.factories[factory];
        allRows.push({
          factory,
          month: MONTHS_FULL[m.month - 1],
          failureRate: fd ? pct(fd.totalFail, fd.totalAudit) : '0.00%',
          oml: fd ? pct(fd.measDef, fd.measQty) : '0.00%',
          oql: fd ? pct(fd.visDef, fd.visQty) : '0.00%',
        });
      });
    });
    const csv = ['Fábrica,Mes,Failure Rate %,OML %,OQL %', ...allRows.map(r => `${r.factory},${r.month},${r.failureRate},${r.oml},${r.oql}`)].join('\n');
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
    factories.forEach((f, i) => { colorMap[f] = i === 0 && f === 'Total General' ? '#ffffff' : FACTORY_COLORS[i % FACTORY_COLORS.length]; });

    const buildDSJson = (metric: 'failureRate' | 'oml' | 'oql') => {
      return factories.map(f => {
        const c = colorMap[f];
        const fRows = rows.filter(r => r.factory === f);
        const data = fRows.map(r => {
          const val = r[metric];
          return parseFloat(val) || 0;
        });
        const sn = f.length > 18 ? f.slice(0, 16) + '…' : f;
        const isTotal = f === 'Total General';
        return `{label:'${sn}',data:${JSON.stringify(data)},borderColor:'${c}',backgroundColor:'${c}22',borderWidth:${isTotal ? 3 : 2},${isTotal ? "borderDash:[8,4]," : ""}pointRadius:4,tension:0.3}`;
      }).join(',');
    };

    const tableRowsHtml = rows.map(r =>
      `<tr><td style="text-align:left">${r.factory}</td><td style="text-align:left">${r.month}</td><td>${r.failureRate}</td><td>${r.oml}</td><td>${r.oql}</td></tr>`
    ).join('');

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
<div class="title"><h1>Dashboard Anual — ${year}</h1><h2>Failure Rate %, OML %, OQL % por Fábrica — ${new Date().toLocaleDateString('es-NI')}</h2></div>
<div class="chart-box"><h3>Failure Rate %</h3><div style="height:320px"><canvas id="ch-fr"></canvas></div></div>
<div class="chart-box"><h3>OML % (Outbound Measurement Level)</h3><div style="height:320px"><canvas id="ch-oml"></canvas></div></div>
<div class="chart-box"><h3>OQL % (Outbound Quality Level)</h3><div style="height:320px"><canvas id="ch-oql"></canvas></div></div>
<div class="table-box"><h3>Detalle por Fábrica y Mes</h3>
<table><thead><tr><th>Fábrica</th><th>Mes</th><th>Failure Rate %</th><th>OML %</th><th>OQL %</th></tr></thead>
<tbody>${tableRowsHtml}</tbody></table></div>
<div class="footer">Sistema de Control QA — Panel Administrativo</div>
</div>
<script>
const labels=${JSON.stringify(months)};
const mkScales=(yMax)=>({x:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}},y:{min:0,max:yMax,ticks:{color:'#9ca3af',callback:v=>v+'%'},grid:{color:'#374151'}}});
const dlPlugin={id:'qaDL',afterDatasetsDraw(chart){const ctx=chart.ctx;const placed=[];chart.data.datasets.forEach((ds,di)=>{const meta=chart.getDatasetMeta(di);if(meta.hidden)return;meta.data.forEach((pt,i)=>{const v=ds.data[i];const lbl=v.toFixed(1)+'%';ctx.save();ctx.font='bold 9px sans-serif';const tw=ctx.measureText(lbl).width;const th=11;ctx.restore();const offsets=[{dx:0,dy:-18},{dx:0,dy:18},{dx:tw/2+6,dy:-18},{dx:tw/2+6,dy:18},{dx:-(tw/2+6),dy:-18},{dx:-(tw/2+6),dy:18},{dx:0,dy:-24},{dx:0,dy:24}];let bx=pt.x,by=pt.y-18;for(const o of offsets){const cx=pt.x+o.dx,cy=pt.y+o.dy;const box={x:cx-tw/2,y:cy-th,w:tw,h:th+2};const hit=placed.some(p=>box.x<p.x+p.w&&box.x+box.w>p.x&&box.y<p.y+p.h&&box.y+box.h>p.y);if(!hit){bx=cx;by=cy;break}}ctx.save();ctx.font='bold 9px sans-serif';ctx.fillStyle=ds.borderColor||'#fff';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(lbl,bx,by);placed.push({x:bx-tw/2,y:by-th,w:tw,h:th+2});ctx.restore()})})}};
const glPlugin=(goalVal,goalColor)=>({id:'gl',afterDatasetsDraw(chart){if(!goalVal&&goalVal!==0)return;const{ctx,chartArea,scales}=chart;const yPx=scales.y.getPixelForValue(goalVal);if(yPx<chartArea.top||yPx>chartArea.bottom)return;ctx.save();ctx.beginPath();ctx.setLineDash([8,4]);ctx.strokeStyle=goalColor;ctx.lineWidth=2;ctx.moveTo(chartArea.left,yPx);ctx.lineTo(chartArea.right,yPx);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=goalColor;ctx.font='bold 10px sans-serif';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText('GOAL: '+goalVal+'%',chartArea.right,yPx-3);ctx.restore()}});
const mkOpts=(title,yMax)=>({responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},layout:{padding:{top:20}},plugins:{legend:{labels:{color:'#d1d5db',font:{size:11},usePointStyle:true,pointStyle:'circle'},position:'bottom'},title:{display:true,text:title,color:'#f3f4f6',font:{size:14,weight:'bold'},padding:{bottom:12}},tooltip:{backgroundColor:'#1f2937',titleColor:'#f3f4f6',bodyColor:'#d1d5db',borderColor:'#374151',borderWidth:1,callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y.toFixed(2)+'%'}}},scales:mkScales(yMax)});
function calcYMax(ds,goal){let m=0;ds.forEach(d=>d.data.forEach(v=>{if(v>m)m=v}));if(goal&&goal>m)m=goal;if(m===0)m=5;const b=Math.max(m*0.15,0.5);return Math.ceil((m+b)*10)/10}
const frDS=[${buildDSJson('failureRate')}];
const omlDS=[${buildDSJson('oml')}];
const oqlDS=[${buildDSJson('oql')}];
new Chart(document.getElementById('ch-fr'),{type:'line',data:{labels,datasets:frDS},plugins:[dlPlugin,glPlugin(${goalFR !== '' ? goalFR : 'null'},'#22c55e')],options:mkOpts('Failure Rate %',calcYMax(frDS,${goalFR !== '' ? goalFR : 'null'}))});
new Chart(document.getElementById('ch-oml'),{type:'line',data:{labels,datasets:omlDS},plugins:[dlPlugin,glPlugin(${goalOML !== '' ? goalOML : 'null'},'#22c55e')],options:mkOpts('OML %',calcYMax(omlDS,${goalOML !== '' ? goalOML : 'null'}))});
new Chart(document.getElementById('ch-oql'),{type:'line',data:{labels,datasets:oqlDS},plugins:[dlPlugin,glPlugin(${goalOQL !== '' ? goalOQL : 'null'},'#22c55e')],options:mkOpts('OQL %',calcYMax(oqlDS,${goalOQL !== '' ? goalOQL : 'null'}))});
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
          <p className="text-xs text-muted-foreground mb-2">Selecciona fábricas:</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedFactories.includes('__TOTAL__') ? 'bg-white text-gray-900 border-white' : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'}`}
              onClick={() => setSelectedFactories(prev =>
                prev.includes('__TOTAL__') ? prev.filter(x => x !== '__TOTAL__') : [...prev, '__TOTAL__']
              )}
            >Total General</button>
            {allFactories.map((f, i) => {
              const color = FACTORY_COLORS[i % FACTORY_COLORS.length];
              const active = selectedFactories.includes(f);
              return (
                <button
                  key={f}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                  style={active ? { backgroundColor: color, borderColor: color, color: '#fff' } : { borderColor: color + '66', color }}
                  onClick={() => toggleFactory(f)}
                >{f}</button>
              );
            })}
          </div>
        </div>

        {/* Goal inputs */}
        <div className="px-6 pt-3 pb-2 border-b border-border/50 shrink-0">
          <p className="text-xs text-muted-foreground mb-2">GOAL (opcional) — linea verde punteada en la gráfica:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-red-400">Failure Rate %</label>
              <input type="number" step="0.1" min="0" max="100" value={goalFR} onChange={e => setGoalFR(e.target.value)}
                placeholder="—" className="w-20 rounded border border-border bg-muted/20 px-2 py-1 text-xs text-foreground text-center focus:outline-none focus:border-red-400" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-amber-400">OML %</label>
              <input type="number" step="0.1" min="0" max="100" value={goalOML} onChange={e => setGoalOML(e.target.value)}
                placeholder="—" className="w-20 rounded border border-border bg-muted/20 px-2 py-1 text-xs text-foreground text-center focus:outline-none focus:border-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-violet-400">OQL %</label>
              <input type="number" step="0.1" min="0" max="100" value={goalOQL} onChange={e => setGoalOQL(e.target.value)}
                placeholder="—" className="w-20 rounded border border-border bg-muted/20 px-2 py-1 text-xs text-foreground text-center focus:outline-none focus:border-violet-400" />
            </div>
          </div>
        </div>

        {/* Label position selector */}
        <div className="px-6 pt-2 pb-2 border-b border-border/50 shrink-0 flex items-center gap-4">
          <p className="text-xs text-muted-foreground">Etiquetas %:</p>
          <div className="flex gap-1">
            {([['auto', 'Automática'], ['top', 'Arriba'], ['bottom', 'Abajo']] as const).map(([val, lbl]) => (
              <button key={val}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${labelPos === val ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'}`}
                onClick={() => setLabelPos(val)}
              >{lbl}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">
          {chartError ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No se pudieron cargar las gráficas. Verifica tu conexión a internet.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/5 p-4">
                <div style={{ height: '280px' }}><canvas ref={chartFailureRef}></canvas></div>
              </div>
              <div className="rounded-lg border border-border bg-muted/5 p-4">
                <div style={{ height: '280px' }}><canvas ref={chartOmlRef}></canvas></div>
              </div>
              <div className="rounded-lg border border-border bg-muted/5 p-4">
                <div style={{ height: '280px' }}><canvas ref={chartOqlRef}></canvas></div>
              </div>
            </>
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
