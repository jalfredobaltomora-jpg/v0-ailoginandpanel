'use client';

export type ReportFormat = 'markdown' | 'csv' | 'json' | 'pdf';

function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {}
}

export function exportJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function exportMarkdown(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, filename);
}

function escapeCSV(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Rows: array of objects or array of arrays. First row is used as header when objects. */
export function exportCSV(rows: Record<string, unknown>[] | unknown[][], filename: string): void {
  let csv = '';
  const first = rows[0];
  if (first && !Array.isArray(first)) {
    const headers = Object.keys(first as Record<string, unknown>);
    csv += headers.map(escapeCSV).join(',') + '\r\n';
    for (const row of rows as Record<string, unknown>[]) {
      csv += headers.map(h => escapeCSV(row[h])).join(',') + '\r\n';
    }
  } else {
    for (const row of rows as unknown[][]) {
      csv += row.map(escapeCSV).join(',') + '\r\n';
    }
  }
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

/** Renders plain text (markdown-ish) to a PDF. */
export async function exportPDF(text: string, filename: string): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    const lines = text.split(/\r?\n/);
    let y = margin;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    for (const rawLine of lines) {
      const line = rawLine.replace(/[*_`#>-]/g, '').trim();
      if (!line) {
        y += 12;
        continue;
      }
      const wrapped = doc.splitTextToSize(line, maxWidth) as string[];
      for (const w of wrapped) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(w, margin, y);
        y += 14;
      }
    }
    doc.save(filename);
  } catch {}
}

export async function exportReport(format: ReportFormat, data: unknown, markdown: string, filename: string): Promise<void> {
  switch (format) {
    case 'json':
      exportJSON(data ?? { reporte: markdown }, `${filename}.json`);
      break;
    case 'csv': {
      const rows = Array.isArray(data) ? data : [{ contenido: markdown }];
      exportCSV(rows, `${filename}.csv`);
      break;
    }
    case 'pdf':
      await exportPDF(markdown, `${filename}.pdf`);
      break;
    case 'markdown':
    default:
      exportMarkdown(markdown, `${filename}.md`);
      break;
  }
}
