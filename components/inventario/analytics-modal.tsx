'use client';

import { useState, useMemo } from 'react';
import { X, BarChart3, Download, Table2, FileDown, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area, ComposedChart, PieChart as RePieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
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

export function AnalyticsModal({ inlineRecords, defectRecords, empleados, defectCatalogItems, onClose, isAdmin }: AnalyticsModalProps) {
  const [tab, setTab] = useState<'inline' | 'defect'>('inline');

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFactory, setFilterFactory] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterPo, setFilterPo] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');

  // Get unique values for dropdowns
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

  // Filtered data
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
    });
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

  // Time-series data grouped by ISO week
  const inlineTrend = useMemo(() => {
    const groups: Record<number, { week: number; sample: number; reject: number; approved: number; dhuPct: number; passRate: number; count: number }> = {};
    filteredInline.forEach(r => {
      const w = r.week || 0;
      if (!groups[w]) groups[w] = { week: w, sample: 0, reject: 0, approved: 0, dhuPct: 0, passRate: 0, count: 0 };
      groups[w].sample += r.visualSample || 0;
      groups[w].reject += r.visualReject || 0;
      groups[w].approved += r.visualApproved || 0;
      groups[w].dhuPct += (r.dhuScorePercent * 100);
      groups[w].passRate += (r.passRateScorePercent * 100);
      groups[w].count++;
    });
    return Object.values(groups)
      .map(g => ({ ...g, dhuPct: +(g.dhuPct / g.count).toFixed(2), passRate: +(g.passRate / g.count).toFixed(2) }))
      .sort((a, b) => a.week - b.week);
  }, [filteredInline]);

  // Cumulative DHU trend (running average)
  const cumulativeTrend = useMemo(() => {
    let cumReject = 0, cumSample = 0;
    return inlineTrend.map(g => {
      cumReject += g.reject;
      cumSample += g.sample;
      return { week: g.week, cumDHU: +((cumReject / cumSample) * 100).toFixed(2) };
    });
  }, [inlineTrend]);

  // Factory comparison radar data
  const factoryRadar = useMemo(() => {
    const byFactory: Record<string, { sample: number; reject: number; approved: number; count: number }> = {};
    filteredInline.forEach(r => {
      const f = r.factory || 'Unknown';
      if (!byFactory[f]) byFactory[f] = { sample: 0, reject: 0, approved: 0, count: 0 };
      byFactory[f].sample += r.visualSample || 0;
      byFactory[f].reject += r.visualReject || 0;
      byFactory[f].approved += r.visualApproved || 0;
      byFactory[f].count++;
    });
    return Object.entries(byFactory).map(([name, d]) => ({
      name: name.length > 10 ? name.slice(0, 10) + '...' : name,
      'DHU %': +((d.reject / (d.sample || 1)) * 100).toFixed(1),
      'Pass Rate %': +((d.approved / (d.sample || 1)) * 100).toFixed(1),
      Sample: d.sample,
    }));
  }, [filteredInline]);

  // Buyer distribution for pie chart
  const buyerDistribution = useMemo(() => {
    const byBuyer: Record<string, number> = {};
    filteredInline.forEach(r => {
      const b = r.buyer || 'Unknown';
      byBuyer[b] = (byBuyer[b] || 0) + 1;
    });
    return Object.entries(byBuyer)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredInline]);

  // Audit performance data for composed chart
  const composedData = useMemo(() => {
    return inlineTrend.map(g => ({
      week: g.week,
      'DHU %': g.dhuPct,
      'Pass Rate %': g.passRate,
      Records: g.count,
    }));
  }, [inlineTrend]);

  const defectTrend = useMemo(() => {
    const groups: Record<number, { week: number; total: number; count: number }> = {};
    filteredDefect.forEach(r => {
      const w = r.week || 0;
      if (!groups[w]) groups[w] = { week: w, total: 0, count: 0 };
      groups[w].total += r.total || 0;
      groups[w].count++;
    });
    return Object.values(groups).sort((a, b) => a.week - b.week);
  }, [filteredDefect]);

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

  // ─── Excel export with ExcelJS (professional .xlsx) ──────────
  const inlineHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Sample', 'Reject', 'Approved', 'DHU %', 'Performance', 'Pass Rate %'];
  const defectHeader = ['ITEM', 'Date', 'Week', 'Month', 'Factory', 'Line', 'PO', 'Color', 'Buyer', 'Auditor', 'Style', 'Defecto', 'Total', 'Código Defecto', 'Descripción', 'CAT EN', 'ACR', 'Defect CAT EN', 'Descripción Defecto', 'CAT ES', 'ACR S', 'Defect CAT ES'];

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

  const performanceStyles: Record<string, { fill: string; font: string }> = {
    'Very Bad': { fill: 'FFFECACA', font: 'FFDC2626' },
    'Good': { fill: 'FFFEF08A', font: 'FFCA8A04' },
    'Excellent': { fill: 'FFBBF7D0', font: 'FF16A34A' },
  };

  const buildInlineSheet = (ws: any, headerRow: number) => {
    // Header
    const hRow = ws.getRow(headerRow);
    inlineHeader.forEach((h, i) => { ws.getColumn(i + 1).value = h; });
    // Actually set values
    inlineHeader.forEach((h, i) => { ws.getCell(headerRow, i + 1).value = h; });
    hRow.eachCell({ includeEmpty: true }, (cell: any) => {
      cell.fill = headerStyle.fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });
    hRow.height = 22;

    // Data
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
      values.forEach((v, ci) => { ws.getCell(rowNum, ci + 1).value = v; });

      // Apply border to all cells
      row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = cellBorder; });

      // Color only the Performance cell (col 16) and DHU % (col 15)
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

    // Column widths
    const colWidths = [10, 13, 8, 12, 16, 8, 14, 10, 12, 22, 14, 10, 10, 10, 10, 14, 12, 14];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // Auto-filter
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
      values.forEach((v, ci) => { ws.getCell(rowNum, ci + 1).value = v; });
      const row = ws.getRow(rowNum);
      row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = cellBorder; });
      // Zebra striping for defect sheet
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
      // Fallback: basic xlsx via xlsx library
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

              {/* ═══════════ POWER BI-STYLE CHARTS ═══════════ */}
              {/* Performance Donut Chart */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <PieIcon className="h-4 w-4 text-primary" /> Distribución de Performance
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <ResponsiveContainer width="100%" height={220}>
                      <RePieChart>
                        <Pie data={[
                          { name: 'Excellent', value: inlineMetrics.perfCount.Excellent },
                          { name: 'Good', value: inlineMetrics.perfCount.Good },
                          { name: 'Very Bad', value: inlineMetrics.perfCount['Very Bad'] },
                        ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {[0, 1, 2].map((_, i) => <Cell key={i} fill={['#22c55e', '#eab308', '#ef4444'][i]} />)}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-2">
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500" /> <span className="text-xs text-muted-foreground">Excellent: <strong>{inlineMetrics.perfCount.Excellent}</strong></span></div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-500" /> <span className="text-xs text-muted-foreground">Good: <strong>{inlineMetrics.perfCount.Good}</strong></span></div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" /> <span className="text-xs text-muted-foreground">Very Bad: <strong>{inlineMetrics.perfCount['Very Bad']}</strong></span></div>
                  </div>
                </div>
              </div>

              {/* Trend Charts - Line + Area + Composed */}
              {inlineTrend.length > 1 && (
                <>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" /> Tendencias Semanales (Líneas)
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">DHU % por Semana</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={inlineTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Line type="monotone" dataKey="dhuPct" name="DHU %" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">Pass Rate % por Semana</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={inlineTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Area Chart - Cumulative DHU */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" /> DHU % Acumulado (Área)
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cumulativeTrend}>
                        <defs>
                          <linearGradient id="cumDHUGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Area type="monotone" dataKey="cumDHU" name="DHU % Acumulado" stroke="#dc2626" strokeWidth={2} fill="url(#cumDHUGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Composed Chart - DHU % + Pass Rate + Record Count */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <BarChart3 className="h-4 w-4 text-primary" /> Comparativa Semanal (Combinado)
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={composedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="right" dataKey="Records" name="Registros" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                        <Line yAxisId="left" type="monotone" dataKey="DHU %" name="DHU %" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                        <Line yAxisId="left" type="monotone" dataKey="Pass Rate %" name="Pass Rate %" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart - Sample / Reject / Approved */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <BarChart3 className="h-4 w-4 text-primary" /> Sample / Reject / Approved por Semana
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={inlineTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="sample" name="Sample" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="reject" name="Reject" fill="#ef4444" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* Radar Chart - Factory Comparison */}
              {factoryRadar.length > 1 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <PieIcon className="h-4 w-4 text-primary" /> Comparativa por Fábrica (Radar)
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={factoryRadar}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Radar name="DHU %" dataKey="DHU %" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                      <Radar name="Pass Rate %" dataKey="Pass Rate %" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie Chart - Buyer Distribution */}
              {buyerDistribution.length > 1 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <PieIcon className="h-4 w-4 text-primary" /> Distribución por Buyer
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ResponsiveContainer width="100%" height={220}>
                        <RePieChart>
                          <Pie data={buyerDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {buyerDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center gap-1">
                      {buyerDistribution.map((b, i) => (
                        <div key={b.name} className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-muted-foreground">{b.name}: <strong>{b.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
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

              {/* Defect by Code - Pie + Bar + Table */}
              {defectMetrics.defectByCode.length > 0 && (
                <>
                  {/* Defect Code Pie Chart */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <PieIcon className="h-4 w-4 text-primary" /> Distribución de Defectos por Código
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <ResponsiveContainer width="100%" height={260}>
                          <RePieChart>
                            <Pie data={defectMetrics.defectByCode.slice(0, 8)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="total" nameKey="code" label={({ code, percent }) => `${code} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                              {defectMetrics.defectByCode.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        {/* Horizontal Bar - Top Defects */}
                        <p className="mb-2 text-xs text-muted-foreground">Top Defectos</p>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={[...defectMetrics.defectByCode].sort((a, b) => b.total - a.total).slice(0, 10)} layout="vertical" margin={{ left: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis type="category" dataKey="desc" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={80} />
                            <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="total" name="Total" fill="#f97316" radius={[0, 2, 2, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Defect Code Table */}
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
                </>
              )}

              {/* Defect Trend Chart */}
              {defectTrend.length > 1 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" /> Tendencia Semanal de Defectos
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={defectTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" label={{ value: 'Semana', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="total" name="Total Defectos" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
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
