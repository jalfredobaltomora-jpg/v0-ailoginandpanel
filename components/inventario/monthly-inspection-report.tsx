'use client';

import { useMemo } from 'react';
import { Printer, FileSpreadsheet, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EquipoInventario } from '@/lib/firebase';

interface MonthlyInspectionReportProps {
  equipos: EquipoInventario[];
  empleadosMap: Record<string, string>;
}

const accesorioLabels: Record<string, string> = {
  usbCable: 'Cable USB',
  chargerCube: 'Cubo Cargador',
  microSDTrayKey: 'Llave MicroSD',
  cableOTG: 'Cable OTG',
};

const mesActual = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function MonthlyInspectionReport({ equipos, empleadosMap }: MonthlyInspectionReportProps) {
  const getEmpleadoNombre = (code: string) => {
    if (!code) return 'Sin asignar';
    return empleadosMap[code] || code;
  };

  const rows = useMemo(() => {
    const sorted = [...equipos].sort((a, b) => {
      const nameA = getEmpleadoNombre(a.empleadoAsignado || '').toLowerCase();
      const nameB = getEmpleadoNombre(b.empleadoAsignado || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return sorted.map(eq => {
      const ultimoHistorial = eq.historial && eq.historial.length > 0
        ? eq.historial[eq.historial.length - 1]
        : null;
      const accList = eq.accesorios ? Object.entries(eq.accesorios)
        .filter(([k, v]) => v && accesorioLabels[k])
        .map(([k]) => accesorioLabels[k])
        .join(', ') : '';
      return {
        id: eq.id,
        empleadoNombre: getEmpleadoNombre(eq.empleadoAsignado),
        empleadoCodigo: eq.empleadoAsignado,
        tipo: eq.tipo === 'tablet' ? 'Tablet' : 'Scanner',
        marca: eq.marca || '-',
        modelo: eq.modelo || '-',
        serialNumber: eq.serialNumber,
        comentario: eq.estado || 'Sin comentarios',
        accesorios: accList || 'Ninguno',
        fechaAsignacion: eq.fechaAsignacion,
        mesInventario: eq.mesInventario,
        ultimaRevision: ultimoHistorial ? ultimoHistorial.mes : '-',
        ultimoScore: ultimoHistorial ? ultimoHistorial.scoreJAB : null,
        ultimoComentario: ultimoHistorial?.comentarios || '-',
      };
    });
  }, [equipos, empleadosMap]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const now = new Date().toLocaleDateString('es-MX');
    let html = `<!DOCTYPE html><html><head><title>Reporte de Inspeccion Mensual</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
        .sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
        th { background: #06b6d4; color: #fff; font-weight: bold; }
        tr:nth-child(even) { background: #f5f5f5; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; }
        @media print { body { padding: 8px; } }
      </style></head><body>
      <h1>REPORTE MENSUAL - INSPECCION DE INVENTARIO</h1>
      <p class="sub">${now} | Mes de referencia: ${mesActual()}</p>
      <table><thead><tr>
        <th>Usuario</th><th>Codigo</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Serie</th>
        <th>Comentario</th><th>Accesorios</th><th>Asignacion</th><th>Ult. Revision</th>
      </tr></thead><tbody>`;
    for (const r of rows) {
      html += `<tr>
        <td>${r.empleadoNombre}</td><td>${r.empleadoCodigo}</td><td>${r.tipo}</td>
        <td>${r.marca}</td><td>${r.modelo}</td><td>${r.serialNumber}</td>
        <td>${r.comentario}</td><td>${r.accesorios}</td><td>${r.fechaAsignacion}</td>
        <td>${r.ultimaRevision}</td>
      </tr>`;
    }
    html += `</tbody></table>
      <div class="footer">Generado el ${new Date().toLocaleString('es-MX')}</div>
    </body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = rows.map(r => ({
      Usuario: r.empleadoNombre,
      Codigo: r.empleadoCodigo,
      Tipo: r.tipo,
      Marca: r.marca,
      Modelo: r.modelo,
      Serie: r.serialNumber,
      Comentario: r.comentario,
      Accesorios: r.accesorios,
      Asignacion: r.fechaAsignacion,
      Mes_Inventario: r.mesInventario,
      Ultima_Revision: r.ultimaRevision,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Inspeccion Mensual');
    // Auto-fit column widths
    const colWidths = Object.keys(data[0] || {}).map(k => ({
      wch: Math.max(k.length, ...data.map(r => String((r as any)[k] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;
    XLSX.writeFile(wb, `inspeccion-mensual-${mesActual()}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Reporte de inspeccion del mes: <strong>{mesActual()}</strong> — {rows.length} equipos registrados
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-border" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" className="border-border" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/10 border-b border-border">
              <th className="p-2 text-left font-medium text-primary">Usuario</th>
              <th className="p-2 text-left font-medium text-primary">Código</th>
              <th className="p-2 text-left font-medium text-primary">Tipo</th>
              <th className="p-2 text-left font-medium text-primary">Marca</th>
              <th className="p-2 text-left font-medium text-primary">Modelo</th>
              <th className="p-2 text-left font-medium text-primary">Serie</th>
              <th className="p-2 text-left font-medium text-primary">Comentario</th>
              <th className="p-2 text-left font-medium text-primary">Accesorios</th>
              <th className="p-2 text-left font-medium text-primary">Asignación</th>
              <th className="p-2 text-left font-medium text-primary">Últ. Revisión</th>
              <th className="p-2 text-left font-medium text-primary">Score JAB</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-4 text-center text-muted-foreground">
                  No hay equipos registrados
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                  <td className="p-2 font-medium">{r.empleadoNombre}</td>
                  <td className="p-2 text-muted-foreground font-mono text-xs">{r.empleadoCodigo}</td>
                  <td className="p-2">{r.tipo}</td>
                  <td className="p-2">{r.marca}</td>
                  <td className="p-2">{r.modelo}</td>
                  <td className="p-2 font-mono text-xs text-primary">{r.serialNumber}</td>
                  <td className="p-2 text-xs text-muted-foreground max-w-40 truncate">{r.comentario}</td>
                  <td className="p-2 text-xs">{r.accesorios}</td>
                  <td className="p-2 text-xs">{r.fechaAsignacion}</td>
                  <td className="p-2 text-xs">{r.ultimaRevision}</td>
                  <td className="p-2">
                    {r.ultimoScore !== null ? (
                      <span className={`font-bold text-sm ${
                        r.ultimoScore >= 80 ? 'text-green-500' :
                        r.ultimoScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {r.ultimoScore}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
