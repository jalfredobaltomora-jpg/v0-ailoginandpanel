'use client';

import { useState, useMemo } from 'react';
import { X, BarChart3, Download, Table2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QADHURecord, InLineDefectRecord, QADHUDefectCatalogItem } from '@/lib/firebase';

interface Empleado {
  code: string;
  nombres: string;
  apellidos: string;
}

interface AnalyticsModalProps {
  inlineRecords: QADHURecord[];
  defectRecords: InLineDefectRecord[];
  empleados: Empleado[];
  defectCatalogItems: QADHUDefectCatalogItem[];
  onClose: () => void;
}

function getAuditorName(code: string, empleados: Empleado[]): string {
  const e = empleados.find(e => e.code === code);
  if (e) return `${e.nombres} ${e.apellidos}`;
  return code;
}

const factories = ['TECHNOTEX #2', 'EINS', 'DASOLTEX SA'];
const buyers = ['Target', "Kohl's", 'Walmart'];

export function AnalyticsModal({ inlineRecords, defectRecords, empleados, defectCatalogItems, onClose }: AnalyticsModalProps) {
  const [tab, setTab] = useState<'inline' | 'defect'>('inline');

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFactory, setFilterFactory] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterPo, setFilterPo] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');

  // Get unique values for dropdowns
  const months = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.month && set.add(r.month));
    defectRecords.forEach(r => r.month && set.add(r.month));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const lines = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.line && set.add(r.line));
    defectRecords.forEach(r => r.line && set.add(r.line));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const pos = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.po && set.add(r.po));
    defectRecords.forEach(r => r.po && set.add(r.po));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    inlineRecords.forEach(r => r.color && set.add(r.color));
    defectRecords.forEach(r => r.color && set.add(r.color));
    return Array.from(set).sort();
  }, [inlineRecords, defectRecords]);

  // Filtered data
  const filteredInline = useMemo(() => {
    return inlineRecords.filter(r => {
      if (filterMonth && r.month !== filterMonth) return false;
      if (filterFactory && r.factory !== filterFactory) return false;
      if (filterLine && r.line !== filterLine) return false;
      if (filterPo && r.po !== filterPo) return false;
      if (filterColor && r.color !== filterColor) return false;
      if (filterBuyer && r.buyer !== filterBuyer) return false;
      return true;
    });
  }, [inlineRecords, filterMonth, filterFactory, filterLine, filterPo, filterColor, filterBuyer]);

  const filteredDefect = useMemo(() => {
    return defectRecords.filter(r => {
      if (filterMonth && r.month !== filterMonth) return false;
      if (filterFactory && r.factory !== filterFactory) return false;
      if (filterLine && r.line !== filterLine) return false;
      if (filterPo && r.po !== filterPo) return false;
      if (filterColor && r.color !== filterColor) return false;
      if (filterBuyer && r.buyer !== filterBuyer) return false;
      return true;
    });
  }, [defectRecords, filterMonth, filterFactory, filterLine, filterPo, filterColor, filterBuyer]);

  // Metrics for IN LINE
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

  // Metrics for In Line Defect
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

  // --- Excel Export (HTML-based for full styling) ---
  const generateInlineHTML = () => {
    const header = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'DHU %', 'Performance', 'Pass Rate %', 'Created By'];
    const rows = filteredInline.map(r => {
      const perfClass = r.performanceDHU === 'Very Bad' ? 'perf-vbad' : r.performanceDHU === 'Excellent' ? 'perf-excellent' : 'perf-good';
      const dhuPct = (r.dhuScorePercent * 100).toFixed(2);
      const dhuClass = r.performanceDHU === 'Very Bad' ? 'perf-vbad' : r.performanceDHU === 'Excellent' ? 'perf-excellent' : '';
      return [
        r.item, r.inspectionDate, `#${r.week}`, r.month || '',
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.visualSample, r.visualReject, r.visualApproved,
        `<span class="${dhuClass}">${dhuPct}%</span>`,
        `<span class="${perfClass}">${r.performanceDHU}</span>`,
        (r.passRateScorePercent * 100).toFixed(2) + '%',
        r.createdBy || ''
      ];
    });
    return { header, rows };
  };

  const generateDefectHTML = () => {
    const header = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Defecto', 'Total', 'Código Defecto', 'Descripción', 'CAT EN', 'ACR', 'Defect CAT EN', 'Descripción Defecto', 'CAT ES', 'ACR S', 'Defect CAT ES'];
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

  const tableToHTML = (title: string, header: string[], rows: any[][]) => {
    const hdr = header.map(h => `<th style="background:#1a56db;color:#fff;font-weight:700;padding:8px 12px;border:1px solid #1a56db;text-align:left;white-space:nowrap;">${h}</th>`).join('');
    const body = rows.map(row => {
      const cells = row.map((cell: any) => {
        const val = typeof cell === 'object' && cell !== null ? String(cell) : String(cell ?? '');
        return `<td style="padding:4px 8px;border:1px solid #d1d5db;vertical-align:top;white-space:nowrap;">${val}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<h2 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#111;">${title}</h2>
    <table style="border-collapse:collapse;font-size:11px;font-family:Calibri,sans-serif;width:100%;">${hdr ? `<thead><tr>${hdr}</tr></thead>` : ''}<tbody>${body}</tbody></table><br/>`;
  };

  const exportStyledExcel = async (type: 'inline' | 'defect' | 'both') => {
    // Use xlsx for multi-sheet ('both') since HTML can't do multiple sheets reliably
    if (type === 'both') {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      // IN LINE sheet
      const inlineHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'DHU %', 'Performance', 'Pass Rate %', 'Created By'];
      const inlineData = filteredInline.map(r => [
        r.item, r.inspectionDate, `#${r.week}`, r.month || '',
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.visualSample, r.visualReject, r.visualApproved,
        (r.dhuScorePercent * 100).toFixed(2) + '%',
        r.performanceDHU,
        (r.passRateScorePercent * 100).toFixed(2) + '%',
        r.createdBy || ''
      ]);
      const ws1 = XLSX.utils.aoa_to_sheet([inlineHeader, ...inlineData]);
      ws1['!cols'] = inlineHeader.map(() => ({ wch: 14 }));
      XLSX.utils.book_append_sheet(wb, ws1, 'IN LINE');

      // In Line Defect sheet
      const defectHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Defecto', 'Total', 'Código Defecto', 'Descripción', 'CAT EN', 'ACR', 'Defect CAT EN', 'Descripción Defecto', 'CAT ES', 'ACR S', 'Defect CAT ES'];
      const defectData = filteredDefect.map(r => [
        r.item, r.inspectionDate, `#${r.week}`, r.month || '',
        r.factory, r.line || '', r.po || '', r.color || '', r.buyer,
        getAuditorName(r.auditor, empleados), r.style || '',
        r.defect || '', r.total, r.defectCode,
        r.defectDescription || '', r.catEnglish || '', r.acr || '',
        r.defectCatEnglish || '', r.descripcionDefecto || '',
        r.catEspanol || '', r.acrSpanish || '', r.defectCatSpanish || ''
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([defectHeader, ...defectData]);
      ws2['!cols'] = defectHeader.map(() => ({ wch: 14 }));
      XLSX.utils.book_append_sheet(wb, ws2, 'In Line Defect');

      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QA_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // Single-sheet: use full styled HTML
    const isInline = type === 'inline';
    const { header, rows } = isInline ? generateInlineHTML() : generateDefectHTML();
    const title = isInline ? 'IN LINE - QA DHU' : 'In Line Defect';

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <style>
      th { background: #1a56db !important; color: #fff !important; font-weight: 700; }
      .perf-vbad { background: #fecaca !important; color: #dc2626 !important; font-weight: 700; }
      .perf-excellent { background: #bbf7d0 !important; color: #16a34a !important; font-weight: 700; }
      .perf-good { background: #fef08a !important; color: #ca8a04 !important; font-weight: 700; }
      td, th { border: 1px solid #d1d5db; padding: 4px 8px; white-space: nowrap; font-size: 11px; font-family: Calibri, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
    </style></head><body>`;
    html += tableToHTML(title, header, rows);
    html += '</body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QA_Analytics_${isInline ? 'INLINE' : 'Defect'}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [exportOpen, setExportOpen] = useState(false);

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
                  {lines.map(l => <option key={l} value={l}>{l || '(sin línea)'}</option>)}
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
                  {buyers.map(b => <option key={b} value={b}>{b}</option>)}
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

              {/* Performance Distribution */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-center">
                  <div className="text-lg font-bold text-green-500">{inlineMetrics.perfCount.Excellent}</div>
                  <div className="text-xs text-muted-foreground">Excellent</div>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-center">
                  <div className="text-lg font-bold text-yellow-500">{inlineMetrics.perfCount.Good}</div>
                  <div className="text-xs text-muted-foreground">Good</div>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-center">
                  <div className="text-lg font-bold text-red-500">{inlineMetrics.perfCount['Very Bad']}</div>
                  <div className="text-xs text-muted-foreground">Very Bad</div>
                </div>
              </div>

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

              {/* Defect by Code Summary */}
              {defectMetrics.defectByCode.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/10 border-b border-border">
                        <th className="p-2 text-left font-medium text-primary">Código Defecto</th>
                        <th className="p-2 text-left font-medium text-primary">Descripción</th>
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
                        <th className="p-2 text-left font-medium text-primary">Código Defecto</th>
                        <th className="p-2 text-left font-medium text-primary">Descripción</th>
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
              <p className="mb-4 text-xs text-muted-foreground">¿Qué datos deseas exportar?</p>
              <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline" onClick={() => { exportStyledExcel('inline'); setExportOpen(false); }}>
                  <FileDown className="mr-2 h-4 w-4 text-blue-500" /> Solo IN LINE ({filteredInline.length} registros)
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { exportStyledExcel('defect'); setExportOpen(false); }}>
                  <FileDown className="mr-2 h-4 w-4 text-orange-500" /> Solo In Line Defect ({filteredDefect.length} registros)
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => { exportStyledExcel('both'); setExportOpen(false); }}>
                  <FileDown className="mr-2 h-4 w-4 text-green-500" /> Ambos (dos pestañas)
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
