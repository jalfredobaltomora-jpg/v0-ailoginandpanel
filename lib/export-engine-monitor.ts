import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';

// ─── Types ──────────────────────────────────────────────────────────

export interface EngineEntry {
  fecha?: string;
  mesTexto?: string;
  factory?: string;
  buyer?: string;
  style?: string;
  po?: string;
  stage?: string;
  point?: string;
  audits?: number;
  failures?: number;
  failureRate?: number;
  measIns?: number;
  measDef?: number;
  measDefRate?: number;
  visIns?: number;
  visDef?: number;
  visDefRate?: number;
  result?: string;
  [key: string]: unknown;
}

export interface ExportFilters {
  months?: string[];
  factories?: string[];
  buyers?: string[];
  points?: string[];
  [key: string]: unknown;
}

const HEADERS = [
  'Fecha', 'Fabrica', 'Cliente', 'Estilo', 'PO',
  'Stage', 'Point',
  'Audits', 'Failures', 'Failure Rate %',
  'Meas Insp', 'Meas Def', 'Meas Def Rate %',
  'Vis Insp', 'Vis Def', 'Vis Def Rate %',
  'Result',
];

function pctColor(val: number): string {
  const p = val < 1 ? val * 100 : val;
  if (p < 5) return 'FF00D084';
  if (p < 15) return 'FFF59E0B';
  return 'FFF44336';
}

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

function getMonthLabel(r: EngineEntry): string {
  if (r.mesTexto) return r.mesTexto;
  if (r.fecha) {
    const d = new Date(r.fecha);
    if (!isNaN(d.getTime())) return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    return r.fecha;
  }
  return '';
}

// ─── Chart Data Types ────────────────────────────────────────────────

export interface ChartExportData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

// ─── XLSX Generator (Dark Theme + Chart Data) ───────────────────────

const MATRIX_HEADERS = ['Month', 'Factory', 'Buyer', 'No. of Audit', 'No. of Failure', 'Failure Rate(%)', 'Defect Rate(%)', 'Defect Rate(%)', 'Result'];
const CHART_COLORS = ['06B6D4', 'EF4444', '10B981', 'F59E0B', '8B5CF6', 'EC4899', '6366F1'];

interface MatrixRow {
  month: string; factory: string; buyer: string;
  audits: number; failures: number;
  fr: number; mr: number; vr: number; result: string;
  measIns: number; measDef: number; visIns: number; visDef: number;
}

function computeMatrix(records: EngineEntry[]): MatrixRow[] {
  const aggMap = new Map<string, { audits: number; failures: number; measDef: number; measIns: number; visDef: number; visIns: number }>();
  for (const r of records) {
    const key = `${getMonthLabel(r)}|${r.factory ?? ''}|${r.buyer ?? ''}`;
    if (!aggMap.has(key)) aggMap.set(key, { audits: 0, failures: 0, measDef: 0, measIns: 0, visDef: 0, visIns: 0 });
    const a = aggMap.get(key)!;
    a.audits += r.audits ?? 0;
    a.failures += r.failures ?? 0;
    a.measDef += r.measDef ?? 0;
    a.measIns += r.measIns ?? 0;
    a.visDef += r.visDef ?? 0;
    a.visIns += r.visIns ?? 0;
  }
  const rows: MatrixRow[] = [];
  const total: { audits: number; failures: number; measDef: number; measIns: number; visDef: number; visIns: number } = { audits: 0, failures: 0, measDef: 0, measIns: 0, visDef: 0, visIns: 0 };
  for (const [key, v] of aggMap) {
    const [month, factory, buyer] = key.split('|');
    const fr = v.audits > 0 ? +(v.failures / v.audits * 100).toFixed(2) : 0;
    const mr = v.measIns > 0 ? +(v.measDef / v.measIns * 100).toFixed(2) : 0;
    const vr = v.visIns > 0 ? +(v.visDef / v.visIns * 100).toFixed(2) : 0;
    const result = fr < 10 && mr < 15 && vr < 20 ? 'PASS' : 'FAIL';
    rows.push({ month, factory, buyer, audits: v.audits, failures: v.failures, fr, mr, vr, result, measIns: v.measIns, measDef: v.measDef, visIns: v.visIns, visDef: v.visDef });
    total.audits += v.audits;
    total.failures += v.failures;
    total.measDef += v.measDef;
    total.measIns += v.measIns;
    total.visDef += v.visDef;
    total.visIns += v.visIns;
  }
  const tfr = total.audits > 0 ? +(total.failures / total.audits * 100).toFixed(2) : 0;
  const tmr = total.measIns > 0 ? +(total.measDef / total.measIns * 100).toFixed(2) : 0;
  const tvr = total.visIns > 0 ? +(total.visDef / total.visIns * 100).toFixed(2) : 0;
  rows.push({ month: 'TOTAL ACUMULADO', factory: '', buyer: '', audits: total.audits, failures: total.failures, fr: tfr, mr: tmr, vr: tvr, result: '', measIns: total.measIns, measDef: total.measDef, visIns: total.visIns, visDef: total.visDef });
  return rows;
}

function writeMatrixSheet(wb: ExcelJS.Workbook, records: EngineEntry[]) {
  const rows = computeMatrix(records);
  const ws = wb.addWorksheet('Matriz Indicadores');

  // Hidden columns J-M for formula source data
  const TOTAL_VISIBLE = MATRIX_HEADERS.length;
  const TOTAL_COLS = TOTAL_VISIBLE + 4; // + measIns, measDef, visIns, visDef

  function getColVal(r: MatrixRow, i: number): string {
    switch (i) {
      case 0: return r.month;
      case 1: return r.factory;
      case 2: return r.buyer;
      case 3: return String(r.audits);
      case 4: return String(r.failures);
      case 5: return String(r.fr);
      case 6: return String(r.mr);
      case 7: return String(r.vr);
      case 8: return r.result;
      default: return '';
    }
  }
  const colWidths = [...MATRIX_HEADERS.map((h, i) => {
    let maxW = h.length;
    for (const r of rows) {
      maxW = Math.max(maxW, getColVal(r, i).length);
    }
    return Math.max(10, Math.min(maxW + 3, 25));
  }), 0, 0, 0, 0];
  for (let i = 0; i < TOTAL_COLS; i++) {
    ws.getColumn(i + 1).width = colWidths[i];
    if (i >= TOTAL_VISIBLE) ws.getColumn(i + 1).hidden = true;
  }

  // Title
  ws.mergeCells(1, 1, 1, TOTAL_VISIBLE);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'MATRIZ DE INDICADORES DE CALIDAD DE ALTA DIRECCION';
  titleCell.font = { bold: true, color: { argb: 'FF00D084' }, name: 'Calibri', size: 14 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B111B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Header
  for (let c = 0; c < TOTAL_VISIBLE; c++) {
    const cell = ws.getCell(2, c + 1);
    cell.value = MATRIX_HEADERS[c];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00D084' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      bottom: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
    };
  }
  ws.getRow(2).height = 24;

  for (let ri = 0; ri < rows.length; ri++) {
    const isEven = ri % 2 === 0;
    const isTotal = ri === rows.length - 1;
    const r = rows[ri];
    const er = ri + 3; // Excel row number

    // Visible columns
    for (let c = 0; c < TOTAL_VISIBLE; c++) {
      const cell = ws.getCell(er, c + 1);
      const isPct = c >= 5 && c <= 7;
      const isResult = c === 8;
      const cellFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isTotal ? 'FF1E3A8A' : isEven ? 'FF111827' : 'FF0B111B' } };
      cell.fill = cellFill;
      cell.font = {
        color: { argb: 'FFC9D1D9' },
        name: 'Calibri', size: isTotal ? 11 : 10,
        bold: isTotal || isResult,
      };
      cell.alignment = { horizontal: c <= 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        bottom: { style: isTotal ? 'double' : 'thin', color: { argb: isTotal ? 'FF00D084' : 'FF1A1F2E' } },
        left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      };

      if (c === 0) {
        cell.value = r.month;
      } else if (c === 1) {
        cell.value = r.factory;
      } else if (c === 2) {
        cell.value = r.buyer;
      } else if (c === 3) {
        cell.value = r.audits;
        cell.numFmt = '#,##0';
      } else if (c === 4) {
        cell.value = r.failures;
        cell.numFmt = '#,##0';
      } else if (c === 5) {
        // Failure Rate(%): formula =IF(D{er}=0,0,E{er}/D{er}*100)
        if (isTotal) {
          cell.value = r.fr;
          cell.numFmt = '0.00"%"';
        } else {
          cell.value = { formula: `IF(D${er}=0,0,E${er}/D${er}*100)` };
          cell.numFmt = '0.00"%"';
        }
        cell.font = { ...cell.font, color: { argb: pctColor(isTotal ? r.fr : 0) } };
      } else if (c === 6) {
        // Defect Rate(%) meas: formula =IF(J{er}=0,0,K{er}/J{er}*100)
        if (isTotal) {
          cell.value = r.mr;
          cell.numFmt = '0.00"%"';
        } else {
          cell.value = { formula: `IF(J${er}=0,0,K${er}/J${er}*100)` };
          cell.numFmt = '0.00"%"';
        }
        cell.font = { ...cell.font, color: { argb: pctColor(isTotal ? r.mr : 0) } };
      } else if (c === 7) {
        // Defect Rate(%) vis: formula =IF(L{er}=0,0,M{er}/L{er}*100)
        if (isTotal) {
          cell.value = r.vr;
          cell.numFmt = '0.00"%"';
        } else {
          cell.value = { formula: `IF(L${er}=0,0,M${er}/L${er}*100)` };
          cell.numFmt = '0.00"%"';
        }
        cell.font = { ...cell.font, color: { argb: pctColor(isTotal ? r.vr : 0) } };
      } else if (c === 8) {
        // Result: formula =IF(AND(F{er}<10,G{er}<15,H{er}<20),"PASS","FAIL")
        if (isTotal) {
          cell.value = '';
        } else {
          cell.value = { formula: `IF(AND(F${er}<10,G${er}<15,H${er}<20),"PASS","FAIL")` };
        }
        cell.font = { ...cell.font, bold: true, color: { argb: 'FFC9D1D9' } };
      }
    }

    // Hidden columns: J=measIns, K=measDef, L=visIns, M=visDef
    const hiddenVals = [r.measIns, r.measDef, r.visIns, r.visDef];
    for (let hc = 0; hc < 4; hc++) {
      const cell = ws.getCell(er, TOTAL_VISIBLE + 1 + hc);
      cell.value = hiddenVals[hc];
      cell.numFmt = '#,##0';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FF111827' : 'FF0B111B' } };
      cell.font = { color: { argb: 'FFC9D1D9' }, name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        bottom: { style: isTotal ? 'double' : 'thin', color: { argb: isTotal ? 'FF00D084' : 'FF1A1F2E' } },
        left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      };
    }
  }

  // Conditional formatting so formula cells get dynamic colors
  const lastDataExcelRow = rows.length + 1;
  if (lastDataExcelRow >= 3) {
    for (const col of ['F', 'G', 'H']) {
      ws.addConditionalFormatting({
        ref: `${col}3:${col}${lastDataExcelRow}`,
        rules: [
          { priority: 1, type: 'cellIs', operator: 'greaterThan', formulae: [14.99], style: { font: { color: { argb: 'FFF44336' } } } },
          { priority: 2, type: 'cellIs', operator: 'between', formulae: [5, 14.99], style: { font: { color: { argb: 'FFF59E0B' } } } },
          { priority: 3, type: 'cellIs', operator: 'lessThan', formulae: [5], style: { font: { color: { argb: 'FF00D084' } } } },
        ],
      });
    }
  }

  ws.pageSetup.orientation = 'landscape';
  ws.pageSetup.paperSize = 9;
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
}

function writeChartDataSheet(wb: ExcelJS.Workbook, chartData?: ChartExportData) {
  const ws = wb.addWorksheet('Datos Grafico');
  if (!chartData || !chartData.labels.length) {
    ws.getCell(1, 1).value = 'No hay datos de gráfico disponibles';
    return;
  }

  // Header: Etiqueta | Dataset 1 label | Dataset 2 label | ...
  ws.getCell(1, 1).value = 'Etiqueta';
  ws.getCell(1, 1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
  ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00D084' } };
  ws.getColumn(1).width = 20;

  for (let d = 0; d < chartData.datasets.length; d++) {
    const ds = chartData.datasets[d];
    const cell = ws.getCell(1, d + 2);
    cell.value = ds.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${CHART_COLORS[d % CHART_COLORS.length]}` } };
    cell.alignment = { horizontal: 'center' };
    ws.getColumn(d + 2).width = 18;
  }

  // Data rows
  for (let ri = 0; ri < chartData.labels.length; ri++) {
    const isEven = ri % 2 === 0;
    const labelCell = ws.getCell(ri + 2, 1);
    labelCell.value = chartData.labels[ri];
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FF111827' : 'FF0B111B' } };
    labelCell.font = { color: { argb: 'FFC9D1D9' }, name: 'Calibri', size: 10 };
    labelCell.border = {
      top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      bottom: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
    };

    for (let d = 0; d < chartData.datasets.length; d++) {
      const ds = chartData.datasets[d];
      const cell = ws.getCell(ri + 2, d + 2);
      cell.value = ds.data[ri] ?? 0;
      cell.numFmt = '0.00';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FF111827' : 'FF0B111B' } };
      cell.font = { color: { argb: 'FF8B949E' }, name: 'Calibri', size: 10 };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        bottom: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      };
    }
  }
}

function writeDataSheet(ws: ExcelJS.Worksheet, records: EngineEntry[], filters?: ExportFilters) {
  const s = ws;

  // Columns widths
  const colWidths = HEADERS.map((h, i) => {
    let maxW = h.length;
    for (const r of records) {
      const key = HEADERS[i].toLowerCase().replace(/ %/g, '_rate').replace(/\s+/g, '_').replace(/\./g, '');
      const val = String((r as any)[key] ?? r[Object.keys(r).find(k => k.toLowerCase().includes(key.replace('_rate', 'rate')))?.[0] ?? ''] ?? '');
      maxW = Math.max(maxW, val.length);
    }
    return Math.max(10, Math.min(maxW + 3, 35));
  });
  for (let i = 0; i < colWidths.length; i++) s.getColumn(i + 1).width = colWidths[i];

  let row = 1;

  // Title
  s.mergeCells(row, 1, row, HEADERS.length);
  const titleCell = s.getCell(row, 1);
  titleCell.value = 'ENGINE MONITOR - CONTROL ADMINISTRATIVE';
  titleCell.font = { bold: true, color: { argb: 'FF00D084' }, name: 'Calibri', size: 16 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B111B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  s.getRow(row).height = 30;
  row++;

  if (filters) {
    const parts: string[] = [];
    for (const [key, label] of [['months', 'Meses'], ['factories', 'Fabricas'], ['buyers', 'Clientes'], ['points', 'Points']] as const) {
      const vals = filters[key];
      if (vals && vals.length > 0) {
        parts.push(`${label}: ${vals.length < 10 ? vals.slice(0, 5).join(', ') : `${vals.length} seleccionados`}`);
      }
    }
    if (parts.length > 0) {
      s.mergeCells(row, 1, row, HEADERS.length);
      const subCell = s.getCell(row, 1);
      subCell.value = parts.join(' | ');
      subCell.font = { color: { argb: 'FF8B949E' }, name: 'Calibri', size: 9 };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B111B' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      row++;
    }
  }

  row++; // spacer

  // Header row
  for (let c = 0; c < HEADERS.length; c++) {
    const cell = s.getCell(row, c + 1);
    cell.value = HEADERS[c];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00D084' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      bottom: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
    };
  }
  s.getRow(row).height = 26;
  row++;

  // Data rows
  for (let ri = 0; ri < records.length; ri++) {
    const rec = records[ri];
    const isEven = ri % 2 === 0;
    const bgColor = isEven ? 'FF111827' : 'FF0B111B';

    const vals = [
      rec.fecha ?? '', rec.factory ?? '', rec.buyer ?? '',
      rec.style ?? '', rec.po ?? '',
      rec.stage ?? '', rec.point ?? '',
      rec.audits ?? 0, rec.failures ?? 0,
      rec.failureRate ?? 0,
      rec.measIns ?? 0, rec.measDef ?? 0, rec.measDefRate ?? 0,
      rec.visIns ?? 0, rec.visDef ?? 0, rec.visDefRate ?? 0,
      rec.result ?? '',
    ];

    for (let c = 0; c < HEADERS.length; c++) {
      const cell = s.getCell(row, c + 1);
      const hName = HEADERS[c];
      const val = vals[c];
      const textColor = hName.startsWith('Failure') || hName.startsWith('Meas Def Rate') || hName.startsWith('Vis Def Rate')
        ? pctColor(Number(val))
        : hName === 'Result'
          ? (String(val).toUpperCase() === 'PASS' ? 'FF00D084' : String(val).toUpperCase() === 'FAIL' ? 'FFF44336' : 'FFC9D1D9')
          : typeof val === 'number' ? 'FFFFFFFF' : 'FFC9D1D9';
      const resultBg = hName === 'Result' && String(val).toUpperCase() === 'PASS' ? 'FF0B3322'
        : hName === 'Result' && String(val).toUpperCase() === 'FAIL' ? 'FF331111'
        : bgColor;

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: resultBg } };
      cell.font = {
        color: { argb: textColor },
        name: 'Calibri',
        size: 10,
        bold: hName === 'Result',
      };
      cell.alignment = {
        horizontal: hName === 'Result' ? 'center' : typeof val === 'number' ? 'right' : 'left',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        bottom: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        left: { style: 'thin', color: { argb: 'FF1A1F2E' } },
        right: { style: 'thin', color: { argb: 'FF1A1F2E' } },
      };

      if (hName.startsWith('Failure') || hName.startsWith('Meas Def Rate') || hName.startsWith('Vis Def Rate')) {
        cell.value = Number(val);
        cell.numFmt = '0.00%';
      } else if (['Audits', 'Failures', 'Meas Insp', 'Meas Def', 'Vis Insp', 'Vis Def'].includes(hName)) {
        cell.value = Number(val);
        cell.numFmt = '#,##0';
      } else {
        cell.value = val;
      }
    }
    row++;
  }

  // Page setup
  s.pageSetup.orientation = 'landscape';
  s.pageSetup.paperSize = 9;
  s.pageSetup.fitToPage = true;
  s.pageSetup.fitToWidth = 1;
  s.pageSetup.margins = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0, footer: 0 };
}

export async function generateEngineMonitorXLSX(
  records: EngineEntry[],
  chartBase64?: string,
  filters?: ExportFilters,
  chartData?: ChartExportData,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'System JB - Control Administrative';
  wb.created = new Date();

  writeDataSheet(wb.addWorksheet('Engine Monitor'), records, filters);
  writeMatrixSheet(wb, records);
  writeChartDataSheet(wb, chartData);

  const buf = await wb.xlsx.writeBuffer();
  return buf instanceof Blob ? new Uint8Array(await buf.arrayBuffer()) : new Uint8Array(buf);
}

// ─── PPTX Generator (Dark Theme) ────────────────────────────────────

export async function generateEngineMonitorPPTX(
  records: EngineEntry[],
  chartBase64?: string,
  filters?: ExportFilters,
): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CUSTOM_WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'CUSTOM_WIDE';

  // Compute aggregates
  const totalAudits = records.reduce((s, r) => s + (r.audits ?? 0), 0);
  const totalFailures = records.reduce((s, r) => s + (r.failures ?? 0), 0);
  const totalMeasDef = records.reduce((s, r) => s + (r.measDef ?? 0), 0);
  const totalVisDef = records.reduce((s, r) => s + (r.visDef ?? 0), 0);
  const totalMeasIns = records.reduce((s, r) => s + (r.measIns ?? 0), 0);
  const totalVisIns = records.reduce((s, r) => s + (r.visIns ?? 0), 0);
  const frPct = totalAudits > 0 ? (totalFailures / totalAudits * 100) : 0;
  const mrPct = totalMeasIns > 0 ? (totalMeasDef / totalMeasIns * 100) : 0;
  const vrPct = totalVisIns > 0 ? (totalVisDef / totalVisIns * 100) : 0;

  const kpiColor = (pct: number) => pct < 5 ? '00D084' : pct < 15 ? 'F59E0B' : 'F44336';

  // Filter header
  let filterHeader = '';
  if (filters) {
    const parts: string[] = [];
    for (const [key, label] of [['months', 'Meses'], ['factories', 'Fabricas'], ['buyers', 'Clientes'], ['points', 'Points']] as const) {
      const vals = filters[key];
      if (vals && vals.length > 0) {
        parts.push(`${label}: ${vals.length < 10 ? vals.slice(0, 5).join(', ') : `${vals.length} seleccionados`}`);
      }
    }
    if (parts.length > 0) filterHeader = parts.join(' | ');
  }

  // ═══ SLIDE 1: TITLE ═══
  const s1 = pptx.addSlide();
  s1.background = { fill: '0B111B' };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.06, fill: { color: '00D084' }, line: { width: 0 } });
  s1.addText('SYSTEM JB', { x: 0.8, y: 1.5, w: 4, h: 0.8, fontSize: 18, color: '00D084', bold: true, fontFace: 'Calibri' });
  s1.addText('ENGINE MONITOR', { x: 0.8, y: 2.3, w: 8, h: 1.2, fontSize: 44, color: 'FFFFFF', bold: true, fontFace: 'Calibri' });
  s1.addText('Analytical Report - Control Administrative', { x: 0.8, y: 3.4, w: 8, h: 0.8, fontSize: 18, color: '8B949E', fontFace: 'Calibri' });
  s1.addText(`${records.length} registros procesados`, { x: 0.8, y: 4.2, w: 8, h: 0.5, fontSize: 14, color: '00D084', fontFace: 'Calibri' });
  if (filterHeader) s1.addText(filterHeader, { x: 0.8, y: 4.8, w: 10, h: 0.6, fontSize: 12, color: '8B949E', fontFace: 'Calibri' });

  // ═══ SLIDE 2: KPI CARDS ═══
  const s2 = pptx.addSlide();
  s2.background = { fill: '0B111B' };
  s2.addText('RESUMEN DE INDICADORES', { x: 0.5, y: 0.3, w: 6, h: 0.6, fontSize: 20, color: 'FFFFFF', bold: true, fontFace: 'Calibri' });
  if (filterHeader) s2.addText(filterHeader, { x: 0.5, y: 0.9, w: 10, h: 0.4, fontSize: 10, color: '8B949E', fontFace: 'Calibri' });

  const cards: [string, string, string][] = [
    ['Auditorias Realizadas', totalAudits.toLocaleString(), '06B6D4'],
    ['Fallos Detectados', totalFailures.toLocaleString(), 'F44336'],
    ['Tasa de Fracaso', `${frPct.toFixed(2)}%`, kpiColor(frPct)],
    ['Defectos Medicion', totalMeasDef.toLocaleString(), '10B981'],
  ];

  const cardW = 2.8, cardH = 2.2, gap = 0.3;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = (13.333 - totalW) / 2;
  const yTop = 2.0;

  for (let i = 0; i < cards.length; i++) {
    const [title, value, color] = cards[i];
    const x = startX + i * (cardW + gap);
    s2.addShape(pptx.ShapeType.roundRect, {
      x, y: yTop, w: cardW, h: cardH,
      fill: { color: '161B22' },
      line: { color, width: 2 },
    });
    s2.addText(value, {
      x, y: yTop + 0.3, w: cardW, h: 0.8,
      fontSize: 28, color, bold: true, fontFace: 'Calibri',
      align: 'center', valign: 'middle',
    });
    s2.addText(title, {
      x, y: yTop + 1.2, w: cardW, h: 0.5,
      fontSize: 11, color: '8B949E', fontFace: 'Calibri',
      align: 'center',
    });
  }

  // ═══ SLIDE 3: CHART ═══
  const s3 = pptx.addSlide();
  s3.background = { fill: '0B111B' };
  s3.addText('ANALISIS GRAFICO', { x: 0.5, y: 0.3, w: 6, h: 0.6, fontSize: 20, color: 'FFFFFF', bold: true, fontFace: 'Calibri' });
  if (chartBase64) {
    const b64 = chartBase64.replace(/^data:image\/\w+;base64,/, '');
    const dataUri = `data:image/png;base64,${b64}`;
    s3.addImage({ data: dataUri, x: 1.0, y: 1.5, w: 11.3, h: 5.5 });
  } else {
    s3.addText('[Grafico no disponible]', { x: 0.5, y: 3.0, w: 10, h: 0.6, fontSize: 16, color: '8B949E', fontFace: 'Calibri', align: 'center' });
  }

  // ═══ SLIDE 4: DETAIL TABLE ═══
  const s4 = pptx.addSlide();
  s4.background = { fill: '0B111B' };
  s4.addText('MATRIZ DE DETALLE', { x: 0.5, y: 0.3, w: 6, h: 0.6, fontSize: 20, color: 'FFFFFF', bold: true, fontFace: 'Calibri' });
  if (filterHeader) s4.addText(filterHeader, { x: 0.5, y: 0.8, w: 10, h: 0.4, fontSize: 10, color: '8B949E', fontFace: 'Calibri' });

  // Aggregate by month/factory/buyer
  const aggMap = new Map<string, { audits: number; failures: number; measDef: number; measIns: number; visDef: number; visIns: number }>();
  for (const r of records) {
    const key = `${r.fecha ?? ''}|${r.factory ?? ''}|${r.buyer ?? ''}`;
    if (!aggMap.has(key)) aggMap.set(key, { audits: 0, failures: 0, measDef: 0, measIns: 0, visDef: 0, visIns: 0 });
    const a = aggMap.get(key)!;
    a.audits += r.audits ?? 0;
    a.failures += r.failures ?? 0;
    a.measDef += r.measDef ?? 0;
    a.measIns += r.measIns ?? 0;
    a.visDef += r.visDef ?? 0;
    a.visIns += r.visIns ?? 0;
  }

  const tableHeaders = ['Month', 'Factory', 'Buyer', 'Audits', 'Failures', 'FR%', 'M.Def%', 'V.Def%', 'Result'];
  const tableData: string[][] = [];
  for (const [key, v] of aggMap) {
    const [month, factory, buyer] = key.split('|');
    const fr = v.audits > 0 ? (v.failures / v.audits * 100) : 0;
    const mr = v.measIns > 0 ? (v.measDef / v.measIns * 100) : 0;
    const vr = v.visIns > 0 ? (v.visDef / v.visIns * 100) : 0;
    const result = fr < 10 && mr < 15 && vr < 20 ? 'PASS' : 'FAIL';
    tableData.push([month, factory, buyer, String(v.audits), String(v.failures), `${fr.toFixed(1)}%`, `${mr.toFixed(1)}%`, `${vr.toFixed(1)}%`, result]);
  }

  const colW = [1.5, 2.5, 1.8, 1.2, 1.2, 1.2, 1.2, 1.2, 1.0];
  const totColW = colW.reduce((a, b) => a + b, 0);

  const tblHeaderOpts = { fontFace: 'Calibri', fontSize: 10, bold: true, color: 'FFFFFF', align: 'center' as const, valign: 'middle' as const, fill: { color: '00D084' } };
  const tblHeaderCells = tableHeaders.map(h => ({ text: h, options: tblHeaderOpts }));
  const tblDataCells = tableData.map((row, ri) =>
    row.map((val, ci) => ({
      text: val,
      options: {
        fontFace: 'Calibri' as const,
        fontSize: 9,
        valign: 'middle' as const,
        color: ci >= 3 ? '8B949E' : 'FFFFFF',
        align: (ci > 2 ? 'center' : 'left') as 'center' | 'left',
        bold: ci === 8,
        ...(ci === 8 ? { color: val === 'PASS' ? '00D084' as const : 'F44336' as const } : {}),
        fill: { color: ri % 2 === 0 ? '161B22' : '1C2128' },
      },
    }))
  );

  s4.addTable([tblHeaderCells, ...tblDataCells], {
    x: 0.5, y: 1.4, w: totColW,
    colW,
    rowH: 0.35,
    border: { type: 'solid', pt: 0.5, color: '30363D' },
  });

  const isBrowser = typeof window !== 'undefined';
  const outType = isBrowser ? 'blob' : 'nodebuffer';
  const result = await pptx.write({ outputType: outType }) as Buffer | Blob;
  if (result instanceof Blob) return new Uint8Array(await result.arrayBuffer());
  return new Uint8Array(result);
}
