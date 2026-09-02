'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { listenToEquiposInventario } from '@/lib/firebase';
import type { EquipoInventario } from '@/lib/firebase';
import { Laptop, Smartphone, User, Calendar, Tag, Package, CheckCircle, XCircle, ChevronLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!serial) { setLoading(false); setNotFound(true); return; }
    let mounted = true;

    const unsub = listenToEquiposInventario((list) => {
      if (!mounted) return;
      const found = list.find(e => e.serialNumber?.toLowerCase() === serial.toLowerCase());
      if (found) {
        setEquipo(found);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });

    return () => { mounted = false; unsub(); };
  }, [serial]);

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
        <XCircle className="h-16 w-16 text-red-400" />
        <h1 className="text-2xl font-bold">Equipo no encontrado</h1>
        <p className="text-slate-400">Serial: {serial}</p>
        <Link href="/panel/it-manager/inventario" className="mt-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
          Volver al inventario
        </Link>
      </div>
    );
  }

  const tipo = equipo.tipo === 'tablet' ? 'Tablet' : 'Scanner';
  const tipoIcon = equipo.tipo === 'tablet' ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />;
  const accesorios = equipo.accesorios || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-6 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/panel/it-manager/inventario" className="text-slate-400 hover:text-white transition">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-2 text-white">
            {tipoIcon}
            <h1 className="text-xl font-bold">Ficha de Equipo</h1>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-xs uppercase tracking-wider font-medium">{tipo}</div>
              <div className="text-white text-lg font-bold mt-0.5">{equipo.marca} {equipo.modelo}</div>
            </div>
            <div className="bg-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold">
              {equipo.estado || 'Sin estado'}
            </div>
          </div>

          {equipo.fotos && Object.values(equipo.fotos).some(f => f) && (
            <div className="px-6 pt-4">
              <div className="grid grid-cols-4 gap-2">
                {(['frontal', 'trasero', 'lateralIzquierdo', 'lateralDerecho'] as const).map((key) => (
                  <div key={key} className="aspect-square rounded-lg overflow-hidden bg-slate-700 border border-slate-600">
                    {equipo.fotos[key] ? (
                      <img src={equipo.fotos[key]} alt={key} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-1.5">
                {(['frontal', 'trasero', 'lateralIzquierdo', 'lateralDerecho'] as const).map((key) => (
                  <span key={key} className="text-[9px] text-slate-500 capitalize">
                    {key === 'lateralIzquierdo' ? 'Izq' : key === 'lateralDerecho' ? 'Der' : key}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl px-4 py-3">
              <Tag className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">No. Serie</div>
                <div className="text-white font-mono text-sm font-semibold">{equipo.serialNumber}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl px-4 py-3">
              <User className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Asignado a</div>
                <div className="text-white text-sm font-semibold">{equipo.empleadoAsignado || 'Sin asignar'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl px-4 py-3">
              <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Fecha de asignación</div>
                <div className="text-white text-sm font-semibold">{equipo.fechaAsignacion || equipo.mesInventario || '-'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl px-4 py-3">
              <ClipboardList className="h-4 w-4 text-purple-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mes de inventario</div>
                <div className="text-white text-sm font-semibold">{equipo.mesInventario || '-'}</div>
              </div>
            </div>

            <div className="bg-slate-700/40 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-cyan-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Accesorios</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACC_LABELS).map(([key, label]) => {
                  const has = accesorios[key as keyof typeof accesorios];
                  return (
                    <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${has ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-600/40 text-slate-500 border border-slate-600/30'}`}>
                      {has ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-slate-700/50 text-center">
            <span className="text-[10px] text-slate-500">SCA - Sistema de Control Administrativo</span>
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
