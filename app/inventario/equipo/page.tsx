'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { listenToEquiposInventario, getEmpleadosActivos } from '@/lib/firebase';
import type { EquipoInventario, Empleado } from '@/lib/firebase';
import { Download, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import html2canvas from 'html2canvas';

const ACC_LABELS: Record<string, string> = {
  usbCable: 'Cable USB',
  chargerCube: 'Cargador',
  microSDTrayKey: 'Trayectora/Key',
  cableOTG: 'Cable OTG',
};

function EquipoContent() {
  const searchParams = useSearchParams();
  const serial = searchParams.get('serial') || '';
  const [equipo, setEquipo] = useState<EquipoInventario | null>(null);
  const [empleadosMap, setEmpleadosMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getEmpleadosActivos().then((emps: Empleado[]) => {
      const map: Record<string, string> = {};
      emps.forEach((e) => { map[e.code] = `${e.nombres} ${e.apellidos}`.trim(); });
      setEmpleadosMap(map);
    });
  }, []);

  useEffect(() => {
    if (!serial) { setLoading(false); setNotFound(true); return; }
    let mounted = true;
    const unsub = listenToEquiposInventario((list) => {
      if (!mounted) return;
      const found = list.find(e => e.serialNumber?.toLowerCase() === serial.toLowerCase());
      if (found) { setEquipo(found); setNotFound(false); } else { setNotFound(true); }
      setLoading(false);
    });
    return () => { mounted = false; unsub(); };
  }, [serial]);

  const getNombre = (code: string) => empleadosMap[code] || code;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !equipo) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `equipo-${equipo.serialNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setDownloading(false);
    }
  }, [equipo]);

  const handlePrint = useCallback(async () => {
    if (!cardRef.current || !equipo) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const html = `<!DOCTYPE html><html><head><title>Equipo ${equipo.serialNumber}</title>
        <style>@page{size:landscape;margin:8mm}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}img{max-width:100%;max-height:90vh}</style></head>
        <body><img src="${dataUrl}" onload="window.print();window.close()"/></body></html>`;
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch (e) {
      console.error('Print error:', e);
    } finally {
      setDownloading(false);
    }
  }, [equipo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-lg animate-pulse">Cargando equipo...</div>
      </div>
    );
  }

  if (notFound || !equipo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white gap-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-3xl">✕</div>
        <h1 className="text-2xl font-bold">Equipo no encontrado</h1>
        <p className="text-slate-400 text-sm">Serial: {serial}</p>
        <Link href="/panel/it-manager/inventario" className="mt-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition text-sm">Volver al inventario</Link>
      </div>
    );
  }

  const tipo = equipo.tipo === 'tablet' ? 'TABLET' : 'SCANNER';
  const accesorios = equipo.accesorios || {};
  const nombreAsignado = getNombre(equipo.empleadoAsignado);
  const hasPhotos = equipo.fotos && Object.values(equipo.fotos).some(f => f);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-6 px-4">
      <div className="max-w-xl mx-auto">
        {/* Top controls */}
        <div className="flex items-center justify-between mb-5">
          <Link href="/panel/it-manager/inventario" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
            <ArrowLeft className="h-4 w-4" /> Inventario
          </Link>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition">
              <Download className="h-3.5 w-3.5" /> {downloading ? 'Generando...' : 'Descargar'}
            </button>
            <button onClick={handlePrint} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </div>
        </div>

        {/* Printable Card */}
        <div ref={cardRef} className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
          {/* Header band */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e40af, #6d28d9)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white text-lg font-bold">
                {equipo.tipo === 'tablet' ? '📱' : '📟'}
              </div>
              <div>
                <div className="text-blue-200 text-[10px] uppercase tracking-[0.15em] font-medium">{tipo}</div>
                <div className="text-white text-base font-bold leading-tight">{equipo.marca} {equipo.modelo}</div>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: equipo.estado?.toLowerCase().includes('buen') ? 'rgba(34,197,94,0.25)' : equipo.estado?.toLowerCase().includes('regular') ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)', color: equipo.estado?.toLowerCase().includes('buen') ? '#86efac' : equipo.estado?.toLowerCase().includes('regular') ? '#fde047' : '#fca5a5' }}>
              {equipo.estado || 'N/A'}
            </div>
          </div>

          {/* Photos */}
          {hasPhotos && (
            <div className="px-6 pt-4">
              <div className="grid grid-cols-4 gap-2">
                {(['frontal', 'trasero', 'lateralIzquierdo', 'lateralDerecho'] as const).map((key) => (
                  <div key={key} className="aspect-square rounded-xl overflow-hidden bg-slate-700/60 border border-slate-600/40">
                    {equipo.fotos[key] ? (
                      <img src={equipo.fotos[key]} alt={key} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-[9px] uppercase tracking-wider">
                        {key === 'lateralIzquierdo' ? 'Izq.' : key === 'lateralDerecho' ? 'Der.' : key}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="px-6 py-5 space-y-3">
            {[
              { icon: '🏷️', label: 'No. Serie', value: equipo.serialNumber, mono: true },
              { icon: '👤', label: 'Asignado a', value: nombreAsignado },
              { icon: '📅', label: 'Fecha de asignación', value: equipo.fechaAsignacion || equipo.mesInventario || '-' },
              { icon: '📋', label: 'Mes de inventario', value: equipo.mesInventario || '-' },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3 bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
                <span className="text-base mt-0.5 shrink-0">{row.icon}</span>
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-500 uppercase tracking-[0.12em] font-medium">{row.label}</div>
                  <div className={`text-white text-sm font-semibold leading-snug ${row.mono ? 'font-mono' : ''} truncate`}>{row.value}</div>
                </div>
              </div>
            ))}

            {/* Accessories */}
            <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">📦</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-[0.12em] font-medium">Accesorios</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACC_LABELS).map(([key, label]) => {
                  const has = accesorios[key as keyof typeof accesorios];
                  return (
                    <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${has ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-white/[0.03] text-slate-600 border border-white/[0.05]'}`}>
                      {has ? '✓' : '✕'} {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[9px] text-slate-600 font-medium tracking-wider">SCA — SISTEMA DE CONTROL ADMINISTRATIVO</span>
            <span className="text-[9px] text-slate-600">{new Date().toLocaleDateString('es-NI', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EquipoPresentationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-lg animate-pulse">Cargando...</div>
      </div>
    }>
      <EquipoContent />
    </Suspense>
  );
}
