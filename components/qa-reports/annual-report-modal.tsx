'use client';

import { useState } from 'react';
import { X, FileText, FileSpreadsheet, Printer, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
  factories: Record<string, { totalAudit: number; totalFail: number; measQty: number; measDef: number; visQty: number; visDef: number }>;
}

interface AnnualReportModalProps {
  year: number;
  monthlyData: MonthlyData[];
  allFactories: string[];
  onClose: () => void;
}

export function AnnualReportModal({ year, monthlyData, allFactories, onClose }: AnnualReportModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'chart'>('preview');

  const yearTotals = monthlyData.reduce((acc, m) => ({
    totalAudit: acc.totalAudit + m.totalAudit,
    totalFail: acc.totalFail + m.totalFail,
    measQty: acc.measQty + m.measQty,
    measDef: acc.measDef + m.measDef,
    visQty: acc.visQty + m.visQty,
    visDef: acc.visDef + m.visDef,
  }), { totalAudit: 0, totalFail: 0, measQty: 0, measDef: 0, visQty: 0, visDef: 0 });

  const pct = (a: number, b: number) => b === 0 ? '0.00%' : ((a / b) * 100).toFixed(2) + '%';

  const getExportData = () => ({
    headers: ['Mes', 'Semanas', 'No. Auditoría', 'No. Fallos', '% Fallos', 'Cant. Med.', 'Def. Med.', '% Def. Med.', 'Cant. Vis.', 'Def. Vis.', '% Def. Vis.'],
    rows: monthlyData.map(m => [
      MONTHS[m.month - 1], m.records, m.totalAudit, m.totalFail, m.totalRate,
      m.measQty, m.measDef, m.measRate, m.visQty, m.visDef, m.visRate
    ]),
    totals: ['TOTAL ANUAL', monthlyData.reduce((s, m) => s + m.records, 0),
      yearTotals.totalAudit, yearTotals.totalFail,
      pct(yearTotals.totalFail, yearTotals.totalAudit),
      yearTotals.measQty, yearTotals.measDef,
      pct(yearTotals.measDef, yearTotals.measQty),
      yearTotals.visQty, yearTotals.visDef,
      pct(yearTotals.visDef, yearTotals.visQty)
    ]
  });

  const handlePrint = () => {
    const d = getExportData();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Anual QA ${year}</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#1a1a2e}
  h1{text-align:center;color:#0f3460;margin-bottom:4px}
  h2{text-align:center;color:#16213e;font-size:14px;margin-top:0}
  .logo{text-align:center;margin-bottom:16px}
  .logo img{height:40px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
  th{background:#0f3460;color:white;padding:8px 6px;border:1px solid #ddd;text-align:center}
  th:first-child{text-align:left}
  td{padding:6px;border:1px solid #ddd;text-align:center}
  td:first-child{text-align:left;font-weight:bold}
  tr:nth-child(even){background:#f8f9fa}
  tr:last-child{background:#e8f4f8;font-weight:bold}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#666}
  @media print{body{padding:10px}}
</style></head><body>
<div class="logo"><img src="/logo.png" alt="Logo"></div>
<h1>Reporte Anual de Calidad</h1>
<h2>Año ${year}</h2>
<table><thead><tr>${d.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${d.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
<tr>${d.totals.map(c => `<td>${c}</td>`).join('')}</tr></tbody></table>
<div class="footer">Generado el ${new Date().toLocaleDateString('es-NI')} — Sistema QA Panel</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const handleExcel = () => {
    const d = getExportData();
    const csv = [d.headers.join(','), ...d.rows.map(r => r.join(',')), d.totals.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Reporte_Anual_QA_${year}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleHTML = () => {
    const d = getExportData();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Anual QA ${year}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#1a1a2e}
  .page{max-width:1000px;margin:0 auto;padding:30px;background:white;min-height:100vh}
  .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #0f3460}
  .header img{height:50px;margin-bottom:10px}
  .header h1{color:#0f3460;font-size:22px}
  .header h2{color:#16213e;font-size:14px;font-weight:normal;margin-top:4px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .kpi{background:#f8f9fa;border-radius:8px;padding:12px;text-align:center;border-left:4px solid #0f3460}
  .kpi .val{font-size:20px;font-weight:bold;color:#0f3460}
  .kpi .lbl{font-size:10px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#0f3460;color:white;padding:8px 6px;border:1px solid #ddd;text-align:center}
  th:first-child{text-align:left}
  td{padding:6px;border:1px solid #ddd;text-align:center}
  td:first-child{text-align:left;font-weight:bold}
  tr:nth-child(even){background:#f8f9fa}
  .year-total{background:#e8f4f8;font-weight:bold}
  .factory-section{margin-top:24px}
  .factory-section h3{color:#0f3460;font-size:14px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ddd}
  .footer{margin-top:30px;text-align:center;font-size:10px;color:#999;padding-top:16px;border-top:1px solid #eee}
  @media print{.page{padding:15px;box-shadow:none}}
</style></head><body>
<div class="page">
<div class="header">
  <img src="/logo.png" alt="Logo">
  <h1>Reporte Anual de Calidad</h1>
  <h2>Año ${year} — Generado el ${new Date().toLocaleDateString('es-NI')}</h2>
</div>
<div class="summary">
  <div class="kpi"><div class="val">${yearTotals.totalAudit.toLocaleString()}</div><div class="lbl">Total Auditorías</div></div>
  <div class="kpi"><div class="val">${yearTotals.totalFail.toLocaleString()}</div><div class="lbl">Total Fallos</div></div>
  <div class="kpi"><div class="val">${pct(yearTotals.totalFail, yearTotals.totalAudit)}</div><div class="lbl">% Fallos General</div></div>
  <div class="kpi"><div class="val">${monthlyData.reduce((s, m) => s + m.records, 0)}</div><div class="lbl">Total Semanas</div></div>
</div>
<table><thead><tr>${d.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${d.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
<tr class="year-total">${d.totals.map(c => `<td>${c}</td>`).join('')}</tr></tbody></table>
<div class="factory-section"><h3>Desglose por Fábrica (Totales Anuales)</h3>
<table><thead><tr><th>Fábrica / Comprador</th><th>Auditorías</th><th>Fallos</th><th>% Fallos</th><th>Med. Cant.</th><th>Med. Def.</th><th>Vis. Cant.</th><th>Vis. Def.</th></tr></thead>
<tbody>${allFactories.map(f => {
  const fm = monthlyData.reduce((acc, m) => {
    const fd = m.factories[f];
    if (fd) { acc.totalAudit += fd.totalAudit; acc.totalFail += fd.totalFail; acc.measQty += fd.measQty; acc.measDef += fd.measDef; acc.visQty += fd.visQty; acc.visDef += fd.visDef; }
    return acc;
  }, { totalAudit: 0, totalFail: 0, measQty: 0, measDef: 0, visQty: 0, visDef: 0 });
  return `<tr><td>${f}</td><td>${fm.totalAudit}</td><td>${fm.totalFail}</td><td>${pct(fm.totalFail, fm.totalAudit)}</td><td>${fm.measQty}</td><td>${fm.measDef}</td><td>${fm.visQty}</td><td>${fm.visDef}</td></tr>`;
}).join('')}</tbody></table></div>
<div class="footer">Sistema de Control QA — Panel Administrativo</div>
</div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handlePowerBI = () => {
    const labels = JSON.stringify(monthlyData.map(m => `'${MONTHS[m.month - 1]}'`));
    const auditData = JSON.stringify(monthlyData.map(m => m.totalAudit));
    const failData = JSON.stringify(monthlyData.map(m => m.totalFail));
    const measDefData = JSON.stringify(monthlyData.map(m => m.measDef));
    const visDefData = JSON.stringify(monthlyData.map(m => m.visDef));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Power BI — QA ${year}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#111827;color:#f3f4f6;padding:20px}
  .dashboard{max-width:1200px;margin:0 auto}
  .title{text-align:center;margin-bottom:24px}
  .title h1{color:#60a5fa;font-size:24px}
  .title h2{color:#9ca3af;font-size:14px;font-weight:normal}
  .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
  .kpi{background:#1f2937;border-radius:12px;padding:20px;text-align:center;border-top:3px solid #3b82f6}
  .kpi .val{font-size:28px;font-weight:bold;color:#60a5fa}
  .kpi .lbl{font-size:11px;color:#9ca3af;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
  .charts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .chart-box{background:#1f2937;border-radius:12px;padding:20px}
  .chart-box h3{font-size:13px;color:#d1d5db;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151}
  .full-width{grid-column:1/-1}
  .factory-box{background:#1f2937;border-radius:12px;padding:20px;margin-bottom:16px}
  .factory-box h3{font-size:13px;color:#d1d5db;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#374151;color:#d1d5db;padding:8px;text-align:center}
  td{padding:8px;text-align:center;border-bottom:1px solid #374151}
  .footer{text-align:center;font-size:10px;color:#6b7280;margin-top:20px}
</style></head><body>
<div class="dashboard">
<div class="title"><h1>Dashboard Anual de Calidad — ${year}</h1><h2>Reporte generado el ${new Date().toLocaleDateString('es-NI')}</h2></div>
<div class="kpi-row">
  <div class="kpi"><div class="val">${yearTotals.totalAudit.toLocaleString()}</div><div class="lbl">Auditorías</div></div>
  <div class="kpi"><div class="val">${yearTotals.totalFail.toLocaleString()}</div><div class="lbl">Fallos</div></div>
  <div class="kpi"><div class="val">${pct(yearTotals.totalFail, yearTotals.totalAudit)}</div><div class="lbl">% Fallos</div></div>
  <div class="kpi"><div class="val">${monthlyData.reduce((s, m) => s + m.records, 0)}</div><div class="lbl">Semanas</div></div>
</div>
<div class="charts">
  <div class="chart-box full-width"><h3>Auditorías vs Fallos por Mes</h3><canvas id="chart1" height="80"></canvas></div>
  <div class="chart-box"><h3>Defectos Medición por Mes</h3><canvas id="chart2" height="120"></canvas></div>
  <div class="chart-box"><h3>Defectos Visual por Mes</h3><canvas id="chart3" height="120"></canvas></div>
</div>
<div class="factory-box"><h3>Desglose por Fábrica</h3>
<table><thead><tr><th style="text-align:left">Fábrica</th><th>Auditorías</th><th>Fallos</th><th>% Fallos</th><th>Med. Def.</th><th>Vis. Def.</th></tr></thead>
<tbody>${allFactories.map(f => {
  const fm = monthlyData.reduce((acc, m) => {
    const fd = m.factories[f];
    if (fd) { acc.totalAudit += fd.totalAudit; acc.totalFail += fd.totalFail; acc.measDef += fd.measDef; acc.visDef += fd.visDef; }
    return acc;
  }, { totalAudit: 0, totalFail: 0, measDef: 0, visDef: 0 });
  return `<tr><td style="text-align:left">${f}</td><td>${fm.totalAudit}</td><td>${fm.totalFail}</td><td>${pct(fm.totalFail, fm.totalAudit)}</td><td>${fm.measDef}</td><td>${fm.visDef}</td></tr>`;
}).join('')}</tbody></table></div>
<div class="footer">Sistema de Control QA — Panel Administrativo</div>
</div>
<script>
const labels=[${labels}];
new Chart(document.getElementById('chart1'),{type:'bar',data:{labels,datasets:[{label:'Auditorías',data:${auditData},backgroundColor:'rgba(96,165,250,0.7)'},{label:'Fallos',data:${failData},backgroundColor:'rgba(239,68,68,0.7)'}]},options:{responsive:true,plugins:{legend:{labels:{color:'#d1d5db'}}},scales:{x:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}},y:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}}}}});
new Chart(document.getElementById('chart2'),{type:'line',data:{labels,datasets:[{label:'Def. Medición',data:${measDefData},borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.1)',fill:true,tension:0.3}]},options:{responsive:true,plugins:{legend:{labels:{color:'#d1d5db'}}},scales:{x:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}},y:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}}}}});
new Chart(document.getElementById('chart3'),{type:'line',data:{labels,datasets:[{label:'Def. Visual',data:${visDefData},borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,0.1)',fill:true,tension:0.3}]},options:{responsive:true,plugins:{legend:{labels:{color:'#d1d5db'}}},scales:{x:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}},y:{ticks:{color:'#9ca3af'},grid:{color:'#374151'}}}}});
<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Reporte Anual de Calidad — {year}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{monthlyData.length} mes(es) con datos — {monthlyData.reduce((s, m) => s + m.records, 0)} semana(s) en total</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'}`}
            onClick={() => setActiveTab('preview')}
          >Vista Previa</button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'chart' ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'}`}
            onClick={() => setActiveTab('chart')}
          >Gráficas</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/10 border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{yearTotals.totalAudit.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Auditorías</div>
                </div>
                <div className="rounded-lg bg-muted/10 border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{yearTotals.totalFail.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Fallos</div>
                </div>
                <div className="rounded-lg bg-muted/10 border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{pct(yearTotals.totalFail, yearTotals.totalAudit)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">% Fallos</div>
                </div>
                <div className="rounded-lg bg-muted/10 border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{monthlyData.reduce((s, m) => s + m.records, 0)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Semanas</div>
                </div>
              </div>

              {/* Monthly table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="px-3 py-2 text-left text-white">Mes</th>
                        <th className="px-3 py-2 text-cyan-300">Semanas</th>
                        <th className="px-3 py-2 text-cyan-300">Auditorías</th>
                        <th className="px-3 py-2 text-cyan-300">Fallos</th>
                        <th className="px-3 py-2 text-cyan-300">% Fallos</th>
                        <th className="px-3 py-2 text-amber-300">Med. Cant.</th>
                        <th className="px-3 py-2 text-amber-300">Med. Def.</th>
                        <th className="px-3 py-2 text-amber-300">% Def. Med</th>
                        <th className="px-3 py-2 text-violet-300">Vis. Cant.</th>
                        <th className="px-3 py-2 text-violet-300">Vis. Def.</th>
                        <th className="px-3 py-2 text-violet-300">% Def. Vis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map(m => (
                        <tr key={m.month} className="border-b border-border/40 hover:bg-muted/10">
                          <td className="px-3 py-2 font-medium text-foreground">{MONTHS[m.month - 1]}</td>
                          <td className="px-3 py-2 text-center">{m.records}</td>
                          <td className="px-3 py-2 text-center">{m.totalAudit}</td>
                          <td className="px-3 py-2 text-center">{m.totalFail}</td>
                          <td className="px-3 py-2 text-center">{m.totalRate}</td>
                          <td className="px-3 py-2 text-center">{m.measQty}</td>
                          <td className="px-3 py-2 text-center">{m.measDef}</td>
                          <td className="px-3 py-2 text-center">{m.measRate}</td>
                          <td className="px-3 py-2 text-center">{m.visQty}</td>
                          <td className="px-3 py-2 text-center">{m.visDef}</td>
                          <td className="px-3 py-2 text-center">{m.visRate}</td>
                        </tr>
                      ))}
                      <tr className="bg-primary/10 font-bold border-t-2 border-primary/30">
                        <td className="px-3 py-2 text-primary">TOTAL ANUAL</td>
                        <td className="px-3 py-2 text-center">{monthlyData.reduce((s, m) => s + m.records, 0)}</td>
                        <td className="px-3 py-2 text-center">{yearTotals.totalAudit}</td>
                        <td className="px-3 py-2 text-center">{yearTotals.totalFail}</td>
                        <td className="px-3 py-2 text-center">{pct(yearTotals.totalFail, yearTotals.totalAudit)}</td>
                        <td className="px-3 py-2 text-center">{yearTotals.measQty}</td>
                        <td className="px-3 py-2 text-center">{yearTotals.measDef}</td>
                        <td className="px-3 py-2 text-center">{pct(yearTotals.measDef, yearTotals.measQty)}</td>
                        <td className="px-3 py-2 text-center">{yearTotals.visQty}</td>
                        <td className="px-3 py-2 text-center">{yearTotals.visDef}</td>
                        <td className="px-3 py-2 text-center">{pct(yearTotals.visDef, yearTotals.visQty)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Factory breakdown */}
              {allFactories.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/10 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">Desglose por Fábrica</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="px-3 py-2 text-left text-white">Fábrica / Comprador</th>
                          <th className="px-3 py-2 text-cyan-300">Auditorías</th>
                          <th className="px-3 py-2 text-cyan-300">Fallos</th>
                          <th className="px-3 py-2 text-amber-300">Med. Def.</th>
                          <th className="px-3 py-2 text-violet-300">Vis. Def.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allFactories.map(f => {
                          const fm = monthlyData.reduce((acc, m) => {
                            const fd = m.factories[f];
                            if (fd) { acc.totalAudit += fd.totalAudit; acc.totalFail += fd.totalFail; acc.measDef += fd.measDef; acc.visDef += fd.visDef; }
                            return acc;
                          }, { totalAudit: 0, totalFail: 0, measDef: 0, visDef: 0 });
                          return (
                            <tr key={f} className="border-b border-border/40 hover:bg-muted/10">
                              <td className="px-3 py-2 font-medium text-foreground">{f}</td>
                              <td className="px-3 py-2 text-center">{fm.totalAudit}</td>
                              <td className="px-3 py-2 text-center">{fm.totalFail}</td>
                              <td className="px-3 py-2 text-center">{fm.measDef}</td>
                              <td className="px-3 py-2 text-center">{fm.visDef}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Chart view - rendered via Canvas */
            <div className="space-y-4">
              <ChartCanvas monthlyData={monthlyData} year={year} />
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-border">
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

function ChartCanvas({ monthlyData, year }: { monthlyData: MonthlyData[]; year: number }) {
  const [chartReady, setChartReady] = useState(false);
  const [chartError, setChartError] = useState(false);

  const auditData = monthlyData.map(m => m.totalAudit);
  const failData = monthlyData.map(m => m.totalFail);
  const measDefData = monthlyData.map(m => m.measDef);
  const visDefData = monthlyData.map(m => m.visDef);
  const labels = monthlyData.map(m => MONTHS[m.month - 1].slice(0, 3));

  if (chartError) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="mx-auto mb-3 h-12 w-12 opacity-30" />
        <p>No se pudieron cargar las gráficas.</p>
        <p className="text-xs mt-2">Verifica tu conexión a internet (se requiere Chart.js CDN).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Auditorías vs Fallos por Mes</h3>
        <canvas id={`chart-audit-${year}`} height={100}></canvas>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-muted/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Defectos Medición por Mes</h3>
          <canvas id={`chart-meas-${year}`} height={140}></canvas>
        </div>
        <div className="rounded-lg border border-border bg-muted/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Defectos Visual por Mes</h3>
          <canvas id={`chart-vis-${year}`} height={140}></canvas>
        </div>
      </div>
      <ChartScript auditData={auditData} failData={failData} measDefData={measDefData} visDefData={visDefData} labels={labels} year={year} onReady={() => setChartReady(true)} onError={() => setChartError(true)} />
    </div>
  );
}

function ChartScript({ auditData, failData, measDefData, visDefData, labels, year, onReady, onError }: {
  auditData: number[]; failData: number[]; measDefData: number[]; visDefData: number[];
  labels: string[]; year: number; onReady: () => void; onError: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useState(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('chartjs-cdn')) { setLoaded(true); onReady(); return; }
    const script = document.createElement('script');
    script.id = 'chartjs-cdn';
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    script.onload = () => { setLoaded(true); onReady(); };
    script.onerror = () => onError();
    document.head.appendChild(script);
  });

  useState(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      try {
        const mkScale = () => ({ ticks: { color: '#9ca3af' }, grid: { color: '#374151' } });
        const mkLegend = () => ({ labels: { color: '#d1d5db' } });

        const c1 = document.getElementById(`chart-audit-${year}`) as HTMLCanvasElement;
        if (c1 && !c1.dataset.rendered) {
          c1.dataset.rendered = '1';
          new (window as any).Chart(c1, {
            type: 'bar', data: { labels, datasets: [
              { label: 'Auditorías', data: auditData, backgroundColor: 'rgba(96,165,250,0.7)' },
              { label: 'Fallos', data: failData, backgroundColor: 'rgba(239,68,68,0.7)' }
            ]}, options: { responsive: true, plugins: { legend: mkLegend() }, scales: { x: mkScale(), y: mkScale() } }
          });
        }
        const c2 = document.getElementById(`chart-meas-${year}`) as HTMLCanvasElement;
        if (c2 && !c2.dataset.rendered) {
          c2.dataset.rendered = '1';
          new (window as any).Chart(c2, {
            type: 'line', data: { labels, datasets: [
              { label: 'Def. Medición', data: measDefData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 }
            ]}, options: { responsive: true, plugins: { legend: mkLegend() }, scales: { x: mkScale(), y: mkScale() } }
          });
        }
        const c3 = document.getElementById(`chart-vis-${year}`) as HTMLCanvasElement;
        if (c3 && !c3.dataset.rendered) {
          c3.dataset.rendered = '1';
          new (window as any).Chart(c3, {
            type: 'line', data: { labels, datasets: [
              { label: 'Def. Visual', data: visDefData, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3 }
            ]}, options: { responsive: true, plugins: { legend: mkLegend() }, scales: { x: mkScale(), y: mkScale() } }
          });
        }
      } catch { onError(); }
    }, 100);
    return () => clearTimeout(timer);
  });

  return null;
}
