'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Tablet, Scan, Search, Plus, Trash2, Camera, ClipboardCheck, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStoredUser } from '@/lib/auth-store';
import type { EquipoInventario, UsuarioIT } from '@/lib/firebase';
import { tienePermiso } from '@/lib/permisos';

const EquipmentFormModal = dynamic(() => import('@/components/inventario/equipment-form-modal').then(m => m.EquipmentFormModal), { ssr: false });
const QRLabel = dynamic(() => import('@/components/inventario/qr-label').then(m => m.QRLabel), { ssr: false });
const MonthlyCheckModal = dynamic(() => import('@/components/inventario/monthly-check-modal').then(m => m.MonthlyCheckModal), { ssr: false });
const ReinspectionModal = dynamic(() => import('@/components/inventario/reinspection-modal').then(m => m.ReinspectionModal), { ssr: false });
const MonthlyInspectionReport = dynamic(() => import('@/components/inventario/monthly-inspection-report').then(m => m.MonthlyInspectionReport), { ssr: false });
const PhotoGallery = dynamic(() => import('@/components/inventario/photo-gallery').then(m => m.PhotoGallery), { ssr: false });

export default function InventarioPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioIT | null>(null);
  const [equipos, setEquipos] = useState<EquipoInventario[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tablet' | 'scanner' | 'inspection'>('tablet');
  const [empleadosMap, setEmpleadosMap] = useState<Record<string, string>>({});
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoInventario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [photoGallery, setPhotoGallery] = useState<{ photos: { url: string; label: string }[]; index: number } | null>(null);
  const [checkEquipo, setCheckEquipo] = useState<EquipoInventario | null>(null);
  const [reinspectEquipo, setReinspectEquipo] = useState<EquipoInventario | null>(null);

  // Inventory reminder on mount
  useEffect(() => {
    import('@/lib/inventory-reminder').then(({ scheduleReminderCheck }) => {
      if (Notification.permission === 'default') Notification.requestPermission();
      scheduleReminderCheck();
    });
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push('/');
      return;
    }
    if (!tienePermiso(user, 'itManager') && !tienePermiso(user, 'it_inventario_ver')) {
      router.push('/panel');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    import('@/lib/firebase').then(({ getEmpleadosActivos }) => {
      getEmpleadosActivos().then(list => {
        const map: Record<string, string> = {};
        for (const e of list) {
          map[e.code] = `${e.nombres} ${e.apellidos}`;
        }
        setEmpleadosMap(map);
      });
    });
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;
    import('@/lib/firebase').then(({ listenToEquiposInventario }) => {
      setLoading(true);
      unsubscribe = listenToEquiposInventario((data) => {
        setEquipos(data);
        setLoading(false);
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const filteredEquipos = equipos.filter((e) => {
    if (activeTab === 'inspection') return false;
    const matchesTipo = e.tipo === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      (e.serialNumber || '').toLowerCase().includes(q) ||
      (e.estado || '').toLowerCase().includes(q) ||
      (e.empleadoAsignado || '').toLowerCase().includes(q);
    return matchesTipo && matchesSearch;
  });

  const handleCreateNew = () => {
    setSelectedEquipo(null);
    setIsModalOpen(true);
  };

  const handleEdit = (equipo: EquipoInventario) => {
    setSelectedEquipo(equipo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEquipo(null);
  };

  const handleSaved = () => {};

  const handleDelete = async (equipo: EquipoInventario) => {
    if (confirm(`Esta seguro de eliminar el equipo ${equipo.serialNumber}?`)) {
      const { deleteEquipoInventario } = await import('@/lib/firebase');
      await deleteEquipoInventario(equipo.id);
    }
  };

  const getEmpleadoNombre = (code: string) => {
    if (!code) return 'Sin asignar';
    return empleadosMap[code] || code;
  };

  const accesorioLabels: Record<string, string> = {
    usbCable: 'Cable USB',
    chargerCube: 'Cubo Cargador',
    microSDTrayKey: 'Llave MicroSD',
    cableOTG: 'Cable OTG',
  };

  const fotoAngleLabels: { key: keyof EquipoInventario['fotos']; label: string }[] = [
    { key: 'frontal', label: 'Frente' },
    { key: 'trasero', label: 'Atrás' },
    { key: 'lateralIzquierdo', label: 'Izq.' },
    { key: 'lateralDerecho', label: 'Der.' },
  ];

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/panel/it-manager')}
            className="border-border"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h2 className="text-xl font-bold">
            <span className="text-primary">Inventario</span>{' '}
            <span className="text-foreground">de Equipos</span>
          </h2>
        </div>
      </div>

      <div className="p-8">
        <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
          <CardHeader className="flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2 text-primary">
              {activeTab === 'inspection' ? 'Inspeccion Mensual' : 'Equipos Asignados'}
            </CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              {activeTab !== 'inspection' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-64 border-border bg-input pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="border-border"
                    onClick={() => {
                      const win = window.open('', '_blank');
                      if (!win) return;
                      const grouped: Record<string, EquipoInventario[]> = {};
                      for (const eq of equipos) {
                        const name = getEmpleadoNombre(eq.empleadoAsignado);
                        if (!grouped[name]) grouped[name] = [];
                        grouped[name].push(eq);
                      }
                      const sortedNames = Object.keys(grouped).sort();
                      let html = `<!DOCTYPE html><html><head><title>Inventario por Empleado</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
                          h2 { background: #06b6d4; color: #fff; padding: 6px 12px; font-size: 14px; margin: 16px 0 8px; }
                          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
                          th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
                          th { background: #f0f0f0; }
                          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
                          @media print { body { padding: 8px; } }
                        </style></head><body>
                        <h1>INVENTARIO DE EQUIPOS POR EMPLEADO</h1>
                        <p style="text-align:center;font-size:11px;color:#666;">${new Date().toLocaleDateString('es-MX')}</p>`;
                      for (const name of sortedNames) {
                        html += `<h2>${name}</h2><table><thead><tr><th>Serie</th><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Estado</th><th>Asignacion</th><th>Mes Inv.</th></tr></thead><tbody>`;
                        for (const eq of grouped[name]) {
                          html += `<tr><td>${eq.serialNumber}</td><td>${eq.marca || '-'}</td><td>${eq.modelo || '-'}</td><td>${eq.tipo === 'tablet' ? 'Tablet' : 'Scanner'}</td><td>${eq.estado || '-'}</td><td>${eq.fechaAsignacion}</td><td>${eq.mesInventario}</td></tr>`;
                        }
                        html += '</tbody></table>';
                      }
                      html += `<div class="footer">Generado el ${new Date().toLocaleString('es-MX')}</div></body></html>`;
                      win.document.write(html);
                      win.document.close();
                      setTimeout(() => win.print(), 500);
                    }}
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Imprimir x Empleado
                  </Button>
                  {activeTab === 'tablet' && (
                    <Button onClick={handleCreateNew} className="bg-primary text-primary-foreground">
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Chrome-style tabs */}
            <div className="px-6 pt-0">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab('tablet')}
                  className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'tablet'
                      ? 'rounded-t-lg border border-border border-b-0 bg-card text-foreground -mb-px z-10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
                  }`}
                >
                  <Tablet className="h-4 w-4" />
                  Tablet
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                    activeTab === 'tablet'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted-foreground/10 text-muted-foreground'
                  }`}>
                    {equipos.filter(e => e.tipo === 'tablet').length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'scanner'
                      ? 'rounded-t-lg border border-border border-b-0 bg-card text-foreground -mb-px z-10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
                  }`}
                >
                  <Scan className="h-4 w-4" />
                  Scanner
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                    activeTab === 'scanner'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted-foreground/10 text-muted-foreground'
                  }`}>
                    {equipos.filter(e => e.tipo === 'scanner').length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('inspection')}
                  className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'inspection'
                      ? 'rounded-t-lg border border-border border-b-0 bg-card text-foreground -mb-px z-10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Inspeccion Mensual
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="border-t border-border p-6">
              {activeTab === 'inspection' ? (
                <MonthlyInspectionReport equipos={equipos} empleadosMap={empleadosMap} />
              ) : loading ? (
                <div className="py-12 text-center text-muted-foreground">Cargando...</div>
              ) : filteredEquipos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No hay equipos registrados
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEquipos.map((eq) => (
                    <div
                      key={eq.id}
                      className="rounded-lg border border-border bg-muted/20 p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => handleEdit(eq)}
                    >
                      {/* Photo strip */}
                      <div className="mb-3 flex gap-2">
                        {fotoAngleLabels.map(({ key, label }) => (
                          <div
                            key={key}
                            className="relative flex h-20 flex-1 items-center justify-center rounded-md border border-border/50 bg-muted/10 overflow-hidden"
                          >
                            {eq.fotos?.[key] ? (
                              <img
                                src={eq.fotos[key]}
                                alt={label}
                                className="h-full w-full object-cover"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ordered = fotoAngleLabels
                                    .filter(f => eq.fotos[f.key])
                                    .map(f => ({ url: eq.fotos[f.key], label: f.label }));
                                  setPhotoGallery({ photos: ordered, index: Math.max(0, ordered.findIndex(p => p.url === eq.fotos[key])) });
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-0.5 text-muted-foreground/40">
                                <Camera className="h-5 w-5" />
                                <span className="text-[10px]">{label}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Info row */}
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-xs text-primary">
                              {eq.serialNumber}
                            </span>
                            {eq.marca && (
                              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                                {eq.marca}
                              </span>
                            )}
                            {eq.modelo && (
                              <span className="rounded bg-muted-foreground/10 px-2 py-0.5 text-xs text-muted-foreground">
                                {eq.modelo}
                              </span>
                            )}
                            <span className="font-medium text-foreground truncate">
                              {getEmpleadoNombre(eq.empleadoAsignado)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">Comentario:</span> {eq.estado || 'Sin comentarios'}
                            <span className="mx-2">|</span>
                            <span className="font-medium">Asignacion:</span> {eq.fechaAsignacion}
                            <span className="mx-2">|</span>
                            <span className="font-medium">Mes:</span> {eq.mesInventario}
                          </div>
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            {Object.entries(eq.accesorios).filter(([,v]) => v).map(([k]) => (
                              <span key={k} className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-500">
                                {accesorioLabels[k]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <QRLabel equipo={eq} empleadoNombre={getEmpleadoNombre(eq.empleadoAsignado)} size={100} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-cyan-400"
                            onClick={(e) => { e.stopPropagation(); setReinspectEquipo(eq); }}
                            title="Reinspeccion de inventario"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleDelete(eq); }}
                          title="Eliminar equipo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <EquipmentFormModal
          equipo={selectedEquipo}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}

      {checkEquipo && (
        <MonthlyCheckModal
          equipo={checkEquipo}
          empleadoNombre={getEmpleadoNombre(checkEquipo.empleadoAsignado)}
          onClose={() => setCheckEquipo(null)}
          onSaved={() => {}}
        />
      )}

      {reinspectEquipo && (
        <ReinspectionModal
          equipo={reinspectEquipo}
          empleadoNombre={getEmpleadoNombre(reinspectEquipo.empleadoAsignado)}
          onClose={() => setReinspectEquipo(null)}
          onEdit={() => { handleEdit(reinspectEquipo); }}
          onSaved={() => {}}
        />
      )}

      {photoGallery && (
        <PhotoGallery
          photos={photoGallery.photos}
          initialIndex={photoGallery.index}
          onClose={() => setPhotoGallery(null)}
        />
      )}
    </main>
  );
}
