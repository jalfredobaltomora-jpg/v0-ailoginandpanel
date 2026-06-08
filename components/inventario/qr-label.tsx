'use client';

import { useRef, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
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
  cableOTG: 'Cable OTG',
};

function truncate(v: string | undefined | null, max: number): string {
  if (!v) return '-';
  return v.length > max ? v.slice(0, max) + '…' : v;
}

function buildQRLines(equipo: EquipoInventario, empleadoNombre: string): string {
  const accs = Object.entries(equipo.accesorios || {})
    .filter(([k, v]) => v && accesorioLabelsQR[k])
    .map(([k]) => accesorioLabelsQR[k])
    .join(', ');
  return [
    `Emp: ${truncate(empleadoNombre, 80) || 'Sin asignar'}`,
    `Cod: ${equipo.empleadoAsignado || '-'}`,
    `Tipo: ${equipo.tipo === 'tablet' ? 'Tablet' : 'Scanner'}`,
    `Marca: ${truncate(equipo.marca, 30)}`,
    `Modelo: ${truncate(equipo.modelo, 40)}`,
    `Serie: ${equipo.serialNumber}`,
    `Est: ${truncate(equipo.estado, 200)}`,
    `Acc: ${truncate(accs, 150) || 'Ninguno'}`,
    `Asig: ${truncate(equipo.fechaAsignacion, 20)}`,
    `Mes: ${truncate(equipo.mesInventario, 30)}`,
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
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setQrError(false);
    container.innerHTML = '';

    try {
      new QRCode(container, {
        text: buildQRLines(equipo, empleadoNombre),
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel?.L || 1,
      });
    } catch (e) {
      console.error('QR generation error:', e);
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
    const html = `<!DOCTYPE html><html><head>
      <title>Etiqueta - ${equipo.serialNumber}</title>
      <style>
        @page { size: 6cm 3.5cm; margin: 0; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 6cm; height: 3.5cm; overflow: hidden; }
        .label { width: 6cm; height: 3.5cm; box-sizing: border-box; border: 1.5px solid #000; padding: 4px 6px; display: flex; flex-direction: column; justify-content: space-between; font-size: 7px; }
        .label h2 { text-align: center; margin: 0; font-size: 8px; font-weight: bold; }
        .label .info { flex: 1; }
        .label .info p { margin: 1px 0; line-height: 1.2; }
        .label .qr-section { display: flex; justify-content: flex-end; }
        .label .qr-section img { width: 1.2cm; height: 1.2cm; }
        @media print { body { margin: 0; padding: 0; } }
      </style></head><body>
      <div class="label">
        <h2>INVENTARIO - ${equipo.tipo === 'tablet' ? 'TABLET' : 'SCANNER'}</h2>
        <div class="info">${lines.map(l => `<p>${l}</p>`).join('')}</div>
        <div class="qr-section"><img src="${dataUrl}" /></div>
      </div>
    </body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:-9999px;bottom:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) return;
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      window.focus();
    };
    const doPrint = () => {
      if (!win) return;
      win.print();
      win.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 2000);
    };
    if (win.document.readyState === 'complete') {
      doPrint();
    } else {
      iframe.onload = doPrint;
    }
  };

  return (
    <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {qrError ? (
        <div className="flex items-center justify-center rounded bg-destructive/10 text-destructive text-[10px] px-1" style={{width:size,height:size}}>
          Error QR
        </div>
      ) : (
        <div ref={containerRef} className="flex items-center justify-center" style={{width:size,height:size}} />
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrint} title="Imprimir etiqueta">
        <Printer className="h-3 w-3" />
      </Button>
    </div>
  );
}
