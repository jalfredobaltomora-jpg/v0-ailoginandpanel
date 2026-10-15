'use client';

import { useMemo, useState } from 'react';
import { Printer, FileSpreadsheet, SlidersHorizontal, ListChecks, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Empleado } from '@/lib/firebase';
import { parseDateLocal } from '@/lib/utils';

interface PersonalCatalogReportProps {
  empleados: Empleado[];
  showInactivos: boolean;
}

interface FieldDef {
  key: string;
  label: string;
  getValue: (e: Empleado) => string;
  default?: boolean;
}

const calcEdad = (fechaNac: string): string => {
  if (!fechaNac) return '-';
  const birth = parseDateLocal(fechaNac);
  if (isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age}`;
};

const calcAntiguedad = (fechaIng: string): string => {
  if (!fechaIng) return '-';
  const ing = parseDateLocal(fechaIng);
  if (isNaN(ing.getTime())) return '-';
  const today = new Date();
  let years = today.getFullYear() - ing.getFullYear();
  const m = today.getMonth() - ing.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < ing.getDate())) years--;
  return `${years} ${years === 1 ? 'año' : 'años'}`;
};

const FIELDS: FieldDef[] = [
  { key: 'code', label: 'Código', getValue: (e) => e.code || '-', default: true },
  { key: 'nombre', label: 'Nombre completo', getValue: (e) => `${e.nombres || ''} ${e.apellidos || ''}`.trim() || '-', default: true },
  { key: 'fechaIng', label: 'Fecha de ingreso', getValue: (e) => e.fechaIng || '-', default: true },
  { key: 'cedula', label: 'Cédula', getValue: (e) => e.cedula || '-' },
  { key: 'fechaNac', label: 'Fecha de nacimiento', getValue: (e) => e.fechaNac || '-' },
  { key: 'edad', label: 'Edad', getValue: (e) => calcEdad(e.fechaNac) },
  { key: 'antiguedad', label: 'Antigüedad', getValue: (e) => calcAntiguedad(e.fechaIng) },
  { key: 'area', label: 'Área', getValue: (e) => e.area || '-' },
  { key: 'cargo', label: 'Cargo', getValue: (e) => e.cargo || '-' },
  { key: 'sexo', label: 'Sexo', getValue: (e) => e.sexo || '-' },
  { key: 'estadoCivil', label: 'Estado civil', getValue: (e) => e.estadoCivil || '-' },
  { key: 'nacionalidad', label: 'Nacionalidad', getValue: (e) => e.nacionalidad || '-' },
  { key: 'hijos', label: 'Hijos', getValue: (e) => `${e.hijos ?? 0}` },
  { key: 'direccion', label: 'Dirección', getValue: (e) => e.direccion || '-' },
  { key: 'estado', label: 'Estado', getValue: (e) => (e.activo !== false ? 'Activo' : 'Inactivo') },
  { key: 'recordPolicial', label: 'Record policial', getValue: (e) => (e.recordPolicial ? 'Entregado' : 'Pendiente') },
  { key: 'renovaciones', label: 'Renovaciones', getValue: (e) => `${e.renewalCount ?? 0}` },
];

const DEFAULT_KEYS = FIELDS.filter((f) => f.default).map((f) => f.key);

const escapeHtml = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function PersonalCatalogReport({ empleados, showInactivos }: PersonalCatalogReportProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(DEFAULT_KEYS);

  const activeFields = useMemo(
    () => FIELDS.filter((f) => selected.includes(f.key)),
    [selected],
  );

  const title = showInactivos ? 'Catálogo de Personal Inactivo' : 'Catálogo de Personal Activo';

  const sorted = useMemo(
    () =>
      [...empleados].sort((a, b) =>
        `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`),
      ),
    [empleados],
  );

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const openWith = (preset: string[]) => {
    setSelected(preset);
    setOpen(true);
  };

  const handlePrint = () => {
    if (activeFields.length === 0 || sorted.length === 0) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const now = new Date().toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const headerCells = activeFields
      .map((f) => `<th>${escapeHtml(f.label)}</th>`)
      .join('');

    const bodyRows = sorted
      .map((e, idx) => {
        const cells = activeFields
          .map((f) => {
            const val = f.getValue(e);
            let style = '';
            if (f.key === 'estado') {
              style =
                e.activo !== false
                  ? 'background:#dcfce7;color:#15803d;font-weight:700;'
                  : 'background:#fee2e2;color:#b91c1c;font-weight:700;';
            } else if (f.key === 'code') {
              style = 'font-family:monospace;color:#4338ca;font-weight:600;';
            } else if (f.key === 'recordPolicial') {
              style = e.recordPolicial
                ? 'background:#dcfce7;color:#15803d;font-weight:600;'
                : 'background:#fef3c7;color:#b45309;font-weight:600;';
            }
            return `<td style="${style}">${escapeHtml(val)}</td>`;
          })
          .join('');
        return `<tr class="${idx % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 28px; background: #fff; color: #1e293b; }
        .banner { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #7c3aed 100%); color: #fff; padding: 22px 26px; border-radius: 14px; margin-bottom: 18px; box-shadow: 0 8px 20px rgba(37,99,235,0.28); }
        .banner h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .banner .sub { margin-top: 6px; font-size: 12px; opacity: 0.9; display: flex; gap: 18px; flex-wrap: wrap; }
        .banner .badge { background: rgba(255,255,255,0.22); padding: 2px 10px; border-radius: 999px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
        thead th { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #fff; text-transform: uppercase; letter-spacing: 0.4px; font-size: 10px; padding: 10px 8px; text-align: left; border: none; }
        tbody td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        tbody tr.even { background: #f8fafc; }
        tbody tr.odd { background: #eef2ff; }
        tbody tr:hover { background: #e0e7ff; }
        .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
        @media print {
          body { padding: 10px; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .banner { box-shadow: none; }
        }
      </style></head><body>
      <div class="banner">
        <h1>${escapeHtml(title)}</h1>
        <div class="sub">
          <span class="badge">Total: ${sorted.length} empleados</span>
          <span>Generado: ${escapeHtml(now)}</span>
        </div>
      </div>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="footer">
        <span>Sistema de Control Administrativo - RRHH</span>
        <span>${sorted.length} registros</span>
      </div>
      </body></html>`;

    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
    setOpen(false);
  };

  const handleExportExcel = async () => {
    if (activeFields.length === 0 || sorted.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `catalogo-personal-${showInactivos ? 'inactivo' : 'activo'}-${dateStr}.xlsx`;

    try {
      const mod = await import('exceljs');
      const ExcelJS = mod.default || mod;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'RRHH - Control Administrativo';
      workbook.created = new Date();

      const ws = workbook.addWorksheet('Personal', {
        views: [{ state: 'frozen', ySplit: 3 }],
      });

      ws.mergeCells(1, 1, 1, activeFields.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = title;
      titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      ws.getRow(1).height = 28;

      ws.mergeCells(2, 1, 2, activeFields.length);
      const subCell = ws.getCell(2, 1);
      subCell.value = `Total: ${sorted.length} empleados  ·  Generado: ${new Date().toLocaleString('es-MX')}`;
      subCell.font = { italic: true, size: 10, color: { argb: 'FFE0E7FF' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      ws.getRow(2).height = 18;

      const headerRow = ws.getRow(3);
      activeFields.forEach((f, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = f.label;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        };
      });
      headerRow.height = 22;

      sorted.forEach((e, idx) => {
        const row = ws.addRow(activeFields.map((f) => f.getValue(e)));
        const isEven = idx % 2 === 0;
        row.eachCell((cell, colNumber) => {
          const field = activeFields[colNumber - 1];
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          if (field.key === 'estado') {
            const activo = e.activo !== false;
            cell.font = { bold: true, color: { argb: activo ? 'FF15803D' : 'FFB91C1C' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: activo ? 'FFDCFCE7' : 'FFFEE2E2' } };
          } else if (field.key === 'code') {
            cell.font = { bold: true, color: { argb: 'FF4338CA' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFEEF2FF' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFEEF2FF' } };
          }
        });
      });

      activeFields.forEach((f, i) => {
        const maxLen = Math.max(
          f.label.length,
          ...sorted.map((e) => f.getValue(e).length),
        );
        ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 12), 34);
      });

      ws.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: activeFields.length },
      };

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ExcelJS export failed, falling back:', err);
      const XLSX = await import('xlsx');
      const aoa = [
        activeFields.map((f) => f.label),
        ...sorted.map((e) => activeFields.map((f) => f.getValue(e))),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = activeFields.map((f) => ({ wch: Math.max(f.label.length + 2, 14) }));
      XLSX.utils.book_append_sheet(wb, ws, 'Personal');
      XLSX.writeFile(wb, fileName);
    }
    setOpen(false);
  };

  const basicPreset = ['code', 'nombre', 'fechaIng'];
  const allPreset = FIELDS.map((f) => f.key);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => openWith(DEFAULT_KEYS)}
        title="Imprimir reporte del catálogo"
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir reporte
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="border-green-500/50 text-green-600 hover:bg-green-500/10"
        onClick={() => openWith(DEFAULT_KEYS)}
        title="Exportar catálogo a Excel"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Reporte del Catálogo de Personal</h3>
                  <p className="text-xs text-muted-foreground">
                    {sorted.length} empleados · selecciona los datos a incluir
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <ListChecks className="h-4 w-4" /> Datos a incluir:
                </span>
                <Button size="sm" variant={selected.length === allPreset.length ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setSelected(allPreset)}>
                  Todos
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(basicPreset)}>
                  Básico
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected([])}>
                  Ninguno
                </Button>
                <span className="ml-auto rounded-full bg-primary/15 px-3 py-0.5 text-xs font-semibold text-primary">
                  {activeFields.length} columnas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FIELDS.map((f) => {
                  const checked = selected.includes(f.key);
                  return (
                    <label
                      key={f.key}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                        checked ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(f.key)} />
                      <span className="text-sm">{f.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <Users className="h-4 w-4 shrink-0 text-primary" />
                El reporte incluirá {sorted.length} empleados en formato de tabla con colores.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                disabled={activeFields.length === 0 || sorted.length === 0}
                onClick={handleExportExcel}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Button
                className="bg-primary text-primary-foreground"
                disabled={activeFields.length === 0 || sorted.length === 0}
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
