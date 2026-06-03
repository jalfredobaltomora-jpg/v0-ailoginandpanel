import ExcelJS from 'exceljs';

// ─── Types ──────────────────────────────────────────────────────────

export interface CARecord {
  fecha?: string;
  factory?: string;
  buyer?: string;
  style?: string;
  po?: string;
  colL?: string;
  colM?: string;
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
  mesFiltroKey?: string;
  mesTexto?: string;
  [key: string]: unknown;
}

const HEADERS = [
  'Fecha', 'Fabrica', 'Cliente', 'Estilo', 'PO',
  'Type', 'Name', 'Stage', 'Point',
  'Audits', 'Failures', 'Failure Rate %',
  'Meas Insp', 'Meas Def', 'Meas Def Rate %',
  'Vis Insp', 'Vis Def', 'Vis Def Rate %',
  'Result',
];

const IDX = {
  AUDITS: 9,
  FAILURES: 10,
  FAILURE_RATE: 11,
  MEAS_INSP: 12,
  MEAS_DEF: 13,
  MEAS_DEF_RATE: 14,
  VIS_INSP: 15,
  VIS_DEF: 16,
  VIS_DEF_RATE: 17,
  RESULT: 18,
};

interface Agg {
  audits: number;
  failures: number;
  measIns: number;
  measDef: number;
  visIns: number;
  visDef: number;
}

function zeroAgg(): Agg {
  return { audits: 0, failures: 0, measIns: 0, measDef: 0, visIns: 0, visDef: 0 };
}

function addAgg(t: Agg, s: Agg): void {
  t.audits += s.audits;
  t.failures += s.failures;
  t.measIns += s.measIns;
  t.measDef += s.measDef;
  t.visIns += s.visIns;
  t.visDef += s.visDef;
}

function subRow(agg: Agg, label: string): (string | number)[] {
  const fr = agg.audits > 0 ? agg.failures / agg.audits : 0;
  const mr = agg.measIns > 0 ? agg.measDef / agg.measIns : 0;
  const vr = agg.visIns > 0 ? agg.visDef / agg.visIns : 0;
  return [
    label, '', '', '', '', '', '', '', '',
    agg.audits, agg.failures, fr,
    agg.measIns, agg.measDef, mr,
    agg.visIns, agg.visDef, vr, '',
  ];
}

function dataRow(r: CARecord): (string | number)[] {
  const fr = r.audits! > 0 ? r.failures! / r.audits! : 0;
  const mr = r.measIns! > 0 ? r.measDef! / r.measIns! : 0;
  const vr = r.visIns! > 0 ? r.visDef! / r.visIns! : 0;
  return [
    r.fecha ?? '', r.factory ?? '', r.buyer ?? '', r.style ?? '', r.po ?? '',
    r.colL ?? '', r.colM ?? '', r.stage ?? '', r.point ?? '',
    r.audits ?? 0, r.failures ?? 0, fr,
    r.measIns ?? 0, r.measDef ?? 0, mr,
    r.visIns ?? 0, r.visDef ?? 0, vr, r.result ?? '',
  ];
}

function buildRows(records: CARecord[]): (string | number)[][] {
  const rows: (string | number)[][] = [];

  // Group by monthKey → factory → buyer → point
  const sorted = [...records].sort((a, b) => {
    const mk = (a.mesFiltroKey ?? '').localeCompare(b.mesFiltroKey ?? '');
    if (mk !== 0) return mk;
    const fk = (a.factory ?? '').localeCompare(b.factory ?? '');
    if (fk !== 0) return fk;
    const bk = (a.buyer ?? '').localeCompare(b.buyer ?? '');
    if (bk !== 0) return bk;
    const pk = (a.point ?? '').localeCompare(b.point ?? '');
    if (pk !== 0) return pk;
    return (a.fecha ?? '').localeCompare(b.fecha ?? '');
  });

  let pm = '', pf = '', pb = '', pp = '';
  let am = zeroAgg(), af = zeroAgg(), ab = zeroAgg(), ap = zeroAgg();
  const gt = zeroAgg();

  function flushPoint() {
    if (pp === '') return;
    rows.push(subRow(ap, `  Subtotal ${pp}`));
    addAgg(ab, ap);
    ap = zeroAgg();
  }

  function flushBuyer() {
    if (pb === '') return;
    flushPoint();
    rows.push(subRow(ab, ` Subtotal ${pb}`));
    addAgg(af, ab);
    ab = zeroAgg();
  }

  function flushFactory() {
    if (pf === '') return;
    flushBuyer();
    rows.push(subRow(af, `Total ${pf}`));
    addAgg(am, af);
    af = zeroAgg();
  }

  function flushMonth() {
    if (pm === '') return;
    flushFactory();
    rows.push(subRow(am, `TOTAL ${pm}`));
    addAgg(gt, am);
    am = zeroAgg();
  }

  for (const r of sorted) {
    const mk = r.mesFiltroKey ?? '';
    if (mk !== pm) { flushMonth(); pm = mk; pf = pb = pp = ''; }
    if (r.factory !== pf) { flushFactory(); pf = r.factory ?? ''; pb = pp = ''; }
    if (r.buyer !== pb) { flushBuyer(); pb = r.buyer ?? ''; pp = ''; }
    if (r.point !== pp) { flushPoint(); pp = r.point ?? ''; }
    addAgg(ap, r as Agg);
    rows.push(dataRow(r));
  }

  flushPoint();
  flushBuyer();
  flushFactory();
  flushMonth();
  rows.push(subRow(gt, 'GRAN TOTAL'));

  return rows.filter(r => r.length > 0);
}

function isSubtotalRow(row: (string | number)[]): string | null {
  const v = String(row[0] ?? '');
  if (v === 'GRAN TOTAL') return 'GRAN TOTAL';
  if (v.startsWith('TOTAL ')) return 'TOTAL';
  if (v.startsWith('Total ')) return 'Total';
  if (v.includes(' Subtotal ')) return ' Subtotal ';
  if (v.includes('  Subtotal ')) return '  Subtotal ';
  return null;
}

// ─── XLSX Generator (Professional) ──────────────────────────────────

export async function generateControlAdministrativeXLSX(
  records: CARecord[],
  title = 'CONTROL ADMINISTRATIVE - BASE DEPURADA',
): Promise<Uint8Array> {
  const rows = buildRows(records);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'System JB - Control Administrative';
  wb.created = new Date();
  const ws = wb.addWorksheet('Base Depurada');

  // Column widths
  const colWidths = HEADERS.map((h, i) => {
    let maxW = h.length;
    for (const r of rows) {
      const val = String(r[i] ?? '');
      maxW = Math.max(maxW, val.length);
    }
    return Math.max(10, Math.min(maxW + 3, 40));
  });
  for (let i = 0; i < colWidths.length; i++) ws.getColumn(i + 1).width = colWidths[i];

  let row = 1;

  // Title row
  ws.mergeCells(row, 1, row, HEADERS.length);
  const titleCell = ws.getCell(row, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, color: { argb: 'FF1F4E78' }, name: 'Calibri', size: 14 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = { top: { style: 'thin', color: { argb: 'FFA0A0A0' } }, bottom: { style: 'thin', color: { argb: 'FFA0A0A0' } }, left: { style: 'thin', color: { argb: 'FFA0A0A0' } }, right: { style: 'thin', color: { argb: 'FFA0A0A0' } } };
  ws.getRow(row).height = 30;
  row++;

  // Header row
  for (let c = 0; c < HEADERS.length; c++) {
    const cell = ws.getCell(row, c + 1);
    cell.value = HEADERS[c];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin', color: { argb: 'FFA0A0A0' } }, bottom: { style: 'thin', color: { argb: 'FFA0A0A0' } }, left: { style: 'thin', color: { argb: 'FFA0A0A0' } }, right: { style: 'thin', color: { argb: 'FFA0A0A0' } } };
  }
  ws.getRow(row).height = 28;
  row++;

  // Data rows
  const dataStartRow = row;
  for (let ri = 0; ri < rows.length; ri++) {
    const rowData = rows[ri];
    const st = isSubtotalRow(rowData);

    const getColors = () => {
      if (st === 'GRAN TOTAL') return { bg: 'FF1E3A8A', fg: 'FFFFFFFF', bold: true };
      if (st === 'TOTAL') return { bg: 'FF1E40AF', fg: 'FFDBEAFE', bold: true };
      if (st === 'Total') return { bg: 'FF065F46', fg: 'FFD1FAE5', bold: true };
      if (st === ' Subtotal ') return { bg: 'FF92400E', fg: 'FFFEF3C7', bold: true };
      if (st === '  Subtotal ') return { bg: 'FF5B21B6', fg: 'FFEDE9FE', bold: true };
      return { bg: ri % 2 === 0 ? 'FFF0F4F8' : 'FFFFFFFF', fg: 'FF000000', bold: false };
    };

    for (let c = 0; c < HEADERS.length; c++) {
      const cell = ws.getCell(row, c + 1);
      const val = rowData[c] ?? '';
      const colors = getColors();
      const isPct = c === IDX.FAILURE_RATE || c === IDX.MEAS_DEF_RATE || c === IDX.VIS_DEF_RATE;
      const isInt = c === IDX.AUDITS || c === IDX.FAILURES || c === IDX.MEAS_INSP || c === IDX.MEAS_DEF || c === IDX.VIS_INSP || c === IDX.VIS_DEF;
      const isResult = c === IDX.RESULT;
      const sv = String(val).toUpperCase().trim();
      const isPass = isResult && sv === 'PASS';
      const isFail = isResult && sv === 'FAIL';

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isPass ? 'FFC6EFCE' : isFail ? 'FFFFC7CE' : colors.bg } };
      cell.font = {
        color: { argb: isPass ? 'FF006100' : isFail ? 'FF9C0006' : colors.fg },
        name: 'Calibri',
        size: colors.bold ? (st === 'GRAN TOTAL' ? 11 : 10) : 10,
        bold: isPass || isFail || colors.bold,
      };
      cell.alignment = {
        horizontal: isResult || (isPct && !colors.bold) ? 'center' : isPct || isInt ? 'right' : 'left',
        vertical: 'middle',
      };
      cell.border = { top: { style: 'thin', color: { argb: 'FFA0A0A0' } }, bottom: { style: 'thin', color: { argb: 'FFA0A0A0' } }, left: { style: 'thin', color: { argb: 'FFA0A0A0' } }, right: { style: 'thin', color: { argb: 'FFA0A0A0' } } };

      if (isPct) {
        cell.value = Number(val);
        cell.numFmt = '0.00%';
      } else if (isInt) {
        cell.value = Number(val);
        cell.numFmt = '#,##0';
      } else {
        cell.value = val;
      }
    }
    row++;
  }

  // Page setup
  ws.pageSetup.orientation = 'landscape';
  ws.pageSetup.paperSize = 9; // Letter
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.margins = { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0, footer: 0 };

  const buf = await wb.xlsx.writeBuffer();
  return buf instanceof Blob ? new Uint8Array(await buf.arrayBuffer()) : new Uint8Array(buf);
}
