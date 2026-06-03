'use client';

import { useRef, useEffect, useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EquipoInventario } from '@/lib/firebase';
import QRCode from '@/lib/qrcode-engine';

interface QRLabelProps {
  equipo: EquipoInventario;
  empleadoNombre: string;
  size?: number;
}

const accesorioLabelsQR: Record<string, string> = {
  usbCable: 'Cable USB',
  chargerCube: 'Cubo Cargador',
  microSDTrayKey: 'Llave MicroSD',
};

function buildQRLines(equipo: EquipoInventario, empleadoNombre: string): string {
  const accs = Object.entries(equipo.accesorios)
    .filter(([k, v]) => v && accesorioLabelsQR[k])
    .map(([k]) => accesorioLabelsQR[k])
    .join(', ');
  return [
    `=== INVENTARIO ===`,
    ``,
    `Empleado: ${empleadoNombre || 'Sin asignar'}`,
    `Codigo: ${equipo.empleadoAsignado || '-'}`,
    `Equipo: ${equipo.tipo === 'tablet' ? 'Tablet' : 'Scanner'}`,
    `Marca: ${equipo.marca || '-'}`,
    `Modelo: ${equipo.modelo || '-'}`,
    `Serie: ${equipo.serialNumber}`,
    `Estado: ${equipo.estado || 'Sin comentarios'}`,
    `Accesorios: ${accs || 'Ninguno'}`,
    `Asignacion: ${equipo.fechaAsignacion}`,
    `Mes Inventario: ${equipo.mesInventario}`,
  ].join('\n');
}

function buildLabelLines(equipo: EquipoInventario, empleadoNombre: string): string[] {
  return [
    `Empleado: ${equipo.empleadoAsignado || 'Sin asignar'}`,
    `Nombre: ${empleadoNombre || 'Sin asignar'}`,
    `Serie: ${equipo.serialNumber}`,
    `Marca: ${equipo.marca || '-'}`,
    `Modelo: ${equipo.modelo || '-'}`,
    `Equipo: ${equipo.tipo === 'tablet' ? 'Tablet' : 'Scanner'}`,
    `Fecha Inv.: ${equipo.mesInventario}`,
  ];
}

export function QRLabel({ equipo, empleadoNombre, size = 120 }: QRLabelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setQrReady(false);
    setQrError(false);
    container.innerHTML = '';

    try {
      new QRCode(container, {
        text: buildQRLines(equipo, empleadoNombre),
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel?.M || 0,
      });
      setQrReady(true);
    } catch {
      setQrError(true);
    }
  }, [equipo, empleadoNombre, size]);

  const getCanvasDataUrl = (): string | null => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return null;
    try { return canvas.toDataURL('image/png'); } catch { return null; }
  };

  const handlePrint = () => {
    const dataUrl = getCanvasDataUrl();
    if (!dataUrl) return;
    const lines = buildLabelLines(equipo, empleadoNombre);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Etiqueta - ${equipo.serialNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
        .label { border: 2px solid #000; padding: 16px; display: inline-block; text-align: left; font-size: 14px; }
        .label h2 { text-align: center; margin: 0 0 12px; font-size: 16px; }
        .label p { margin: 4px 0; }
        @media print { body { margin: 0; padding: 8px; } }
      </style></head><body>
      <div class="label">
        <h2>INVENTARIO - ${equipo.tipo === 'tablet' ? 'TABLET' : 'SCANNER'}</h2>
        ${lines.map(l => `<p>${l}</p>`).join('')}
        <img src="${dataUrl}" style="width:120px;height:120px;margin:8px auto;display:block" />
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.close()},500)};<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {qrError ? (
        <div className="flex items-center justify-center rounded bg-destructive/10 text-destructive text-[10px] px-1" style={{width:size,height:size}}>
          Error QR
        </div>
      ) : !qrReady ? (
        <div className="flex items-center justify-center" style={{width:size,height:size}}>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      <div ref={containerRef} className={qrReady ? '' : 'hidden'} />
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrint} title="Imprimir etiqueta">
        <Printer className="h-3 w-3" />
      </Button>
    </div>
  );
}
