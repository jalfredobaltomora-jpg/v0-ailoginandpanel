'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Loader2, Camera, Search, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from './signature-pad';
import { updateEquipoInventario, getEquipoInventario, type EquipoInventario, type HistorialMensual } from '@/lib/firebase';

interface MonthlyAuditModalProps {
  equipos: EquipoInventario[];
  empleadosMap: Record<string, string>;
  editAudit?: { equipoId: string; historial: HistorialMensual } | null;
  onClose: () => void;
  onSaved: () => void;
}

const defaultFotos = { lateralIzquierdo: '', lateralDerecho: '', frontal: '', trasero: '' };

function compressImageBase64(base64: string, maxSize = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = base64;
  });
}

const fotoSlots: { key: keyof typeof defaultFotos; label: string }[] = [
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
  { key: 'lateralIzquierdo', label: 'Lateral Izq.' },
  { key: 'lateralDerecho', label: 'Lateral Der.' },
];

const accesorioLabels: Record<string, string> = {
  usbCable: 'Cable USB',
  chargerCube: 'Cubo Cargador',
  microSDTrayKey: 'Llave MicroSD',
  cableOTG: 'Cable OTG',
};

export function MonthlyAuditModal({ equipos, empleadosMap, editAudit, onClose, onSaved }: MonthlyAuditModalProps) {
  const [searchSerie, setSearchSerie] = useState('');
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoInventario | null>(null);
  const [loadingSerie, setLoadingSerie] = useState(false);
  const [fotos, setFotos] = useState({ ...defaultFotos });
  const [comentarios, setComentarios] = useState('');
  const [firmaAsignado, setFirmaAsignado] = useState('');
  const [firmaAuditor, setFirmaAuditor] = useState('');
  const [aprobado, setAprobado] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EquipoInventario>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  // Auto-select equipo when editing an existing audit
  useEffect(() => {
    if (!editAudit) return;
    const eq = equipos.find(e => e.id === editAudit.equipoId);
    if (eq) {
      setSelectedEquipo(eq);
      setSearchSerie(eq.serialNumber);
      setEditData({ ...eq });
      setComentarios(editAudit.historial.comentarios || '');
      setFirmaAsignado(editAudit.historial.firmaAsignado || '');
      setFirmaAuditor(editAudit.historial.firmaAuditor || '');
      setAprobado(editAudit.historial.scoreJAB >= 80);
      if (editAudit.historial.fotos) {
        setFotos({ ...defaultFotos, ...editAudit.historial.fotos });
      }
    }
  }, [editAudit, equipos]);

  // Search equipment locally first, then Firebase
  const searchResults = useMemo(() => {
    if (!searchSerie.trim()) return [];
    const q = searchSerie.trim().toLowerCase();
    return equipos.filter(e => (e.serialNumber || '').toLowerCase().includes(q)).slice(0, 10);
  }, [searchSerie, equipos]);

  const handleSelectEquipo = (eq: EquipoInventario) => {
    setSelectedEquipo(eq);
    setSearchSerie(eq.serialNumber);
    setEditData({ ...eq });
  };

  const getEmpleadoNombre = (code: string) => {
    if (!code) return 'Sin asignar';
    return empleadosMap[code] || code;
  };

  const handlePhotoUpload = (slot: keyof typeof defaultFotos) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const resized = await compressImageBase64(reader.result as string);
        setFotos(prev => ({ ...prev, [slot]: resized }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSave = async () => {
    if (!selectedEquipo) return;
    setSaving(true);
    setError('');

    const mes = editAudit
      ? editAudit.historial.mes
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const entry: HistorialMensual = {
      mes,
      fotos: fotos as EquipoInventario['fotos'],
      comentarios: comentarios || 'Auditoria de inventario',
      scoreJAB: aprobado ? 100 : -1,
      timestamp: editAudit ? editAudit.historial.timestamp : Date.now(),
      ...(firmaAsignado ? { firmaAsignado } : {}),
      ...(firmaAuditor ? { firmaAuditor } : {}),
    };

    let historial = selectedEquipo.historial || [];
    if (editAudit) {
      historial = historial.map(h => h.timestamp === editAudit.historial.timestamp ? entry : h);
    } else {
      historial = [...historial, entry];
    }

    const updates: Partial<EquipoInventario> = {
      historial,
    };

    if (editing) {
      if (editData.marca) updates.marca = editData.marca;
      if (editData.modelo) updates.modelo = editData.modelo;
      if (editData.estado !== undefined) updates.estado = editData.estado;
      if (editData.empleadoAsignado !== undefined) updates.empleadoAsignado = editData.empleadoAsignado;
      if (editData.mesInventario) updates.mesInventario = editData.mesInventario;
      if (editData.accesorios) updates.accesorios = editData.accesorios;
    }

    const hasNewFotos = Object.values(fotos).some(Boolean);
    if (hasNewFotos) updates.fotos = fotos as EquipoInventario['fotos'];

    const ok = await updateEquipoInventario(selectedEquipo.id, updates);
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
    else setError('Error al guardar la auditoria. Intenta de nuevo.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <CheckSquare className="h-5 w-5" />
            {editAudit ? 'Editar Auditoria de Inventario' : 'Auditoria de Inventario'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {/* Search by serial number */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Buscar equipo por numero de serie</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchSerie}
                onChange={(e) => { setSearchSerie(e.target.value); setSelectedEquipo(null); }}
                placeholder="Escribe el numero de serie..."
                className="w-full border-border bg-input pl-9"
              />
            </div>
            {searchResults.length > 0 && !selectedEquipo && (
              <div className="mt-2 rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
                {searchResults.map(eq => (
                  <button
                    key={eq.id}
                    onClick={() => handleSelectEquipo(eq)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/20 flex items-center gap-2 border-b border-border last:border-0"
                  >
                    <span className="font-mono text-primary text-xs">{eq.serialNumber}</span>
                    <span className="text-muted-foreground">{eq.marca} {eq.modelo}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{getEmpleadoNombre(eq.empleadoAsignado)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedEquipo && (
            <>
              {/* Equipment info + approval */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-primary mb-2">Datos del equipo</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <p><span className="text-muted-foreground">Serie:</span> <span className="font-mono">{selectedEquipo.serialNumber}</span></p>
                      <p><span className="text-muted-foreground">Tipo:</span> {selectedEquipo.tipo === 'tablet' ? 'Tablet' : 'Scanner'}</p>
                      <p><span className="text-muted-foreground">Marca:</span> {editing ? <Input value={editData.marca || ''} onChange={e => setEditData(p => ({ ...p, marca: e.target.value }))} className="h-7 text-sm inline-block w-40" /> : (selectedEquipo.marca || '-')}</p>
                      <p><span className="text-muted-foreground">Modelo:</span> {editing ? <Input value={editData.modelo || ''} onChange={e => setEditData(p => ({ ...p, modelo: e.target.value }))} className="h-7 text-sm inline-block w-40" /> : (selectedEquipo.modelo || '-')}</p>
                      <p><span className="text-muted-foreground">Empleado:</span> {getEmpleadoNombre(selectedEquipo.empleadoAsignado)}</p>
                      <p><span className="text-muted-foreground">Asignacion:</span> {selectedEquipo.fechaAsignacion}</p>
                      <p><span className="text-muted-foreground">Estado:</span> {editing ? <Input value={editData.estado || ''} onChange={e => setEditData(p => ({ ...p, estado: e.target.value }))} className="h-7 text-sm inline-block w-60" /> : (selectedEquipo.estado || 'Sin comentarios')}</p>
                      <p><span className="text-muted-foreground">Mes Inv.:</span> {editing ? <Input value={editData.mesInventario || ''} onChange={e => setEditData(p => ({ ...p, mesInventario: e.target.value }))} className="h-7 text-sm inline-block w-28" /> : selectedEquipo.mesInventario}</p>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Accesorios:</span>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(accesorioLabels).map(([k, label]) => (
                          editing ? (
                            <label key={k} className="flex items-center gap-1 text-xs">
                              <input type="checkbox" checked={(editData.accesorios as any)?.[k] ?? false}
                                onChange={(e) => setEditData(p => ({ ...p, accesorios: { ...(p.accesorios as any), [k]: e.target.checked } }))} />
                              {label}
                            </label>
                          ) : (
                            selectedEquipo.accesorios?.[k as keyof typeof selectedEquipo.accesorios] && (
                              <span key={k} className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-500">{label}</span>
                            )
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center gap-2 rounded-lg border-2 p-3 ${aprobado ? 'border-green-500 bg-green-500/10' : 'border-muted-foreground/30'}`}>
                      <Checkbox checked={aprobado} onCheckedChange={(v) => setAprobado(!!v)} className="h-5 w-5" />
                      <span className="text-sm font-medium">Aprobado</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="border-border">
                      {editing ? 'Cancelar Edicion' : 'Editar Datos'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">Fotos del equipo (tomar nuevas si hay cambios)</label>
                <div className="grid grid-cols-4 gap-2">
                  {fotoSlots.map(({ key, label }) => (
                    <div key={key} className="relative flex flex-col items-center gap-1">
                      <div className={`relative flex h-24 w-full items-center justify-center rounded-lg border-2 overflow-hidden ${
                        fotos[key] ? 'border-primary/30' :
                        selectedEquipo.fotos?.[key] ? 'border-muted-foreground/30 bg-muted/20' : 'border-dashed border-muted-foreground/30 bg-muted/10'
                      }`}>
                        {fotos[key] ? (
                          <img src={fotos[key]} alt={label} className="h-full w-full object-cover cursor-pointer" onClick={() => setViewingPhoto(fotos[key])} />
                        ) : selectedEquipo.fotos?.[key] ? (
                          <img src={selectedEquipo.fotos[key]} alt={label} className="h-full w-full object-cover opacity-60 cursor-pointer" onClick={() => setViewingPhoto(selectedEquipo.fotos[key])} />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                            <Camera className="h-5 w-5" />
                            <span className="text-[10px]">Sin foto</span>
                          </div>
                        )}
                        <button onClick={() => handlePhotoUpload(key)}
                          className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/80 text-primary-foreground text-xs hover:bg-primary"
                          title="Tomar nueva foto">
                          <Camera className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="mb-2 block text-sm font-medium text-primary">Comentarios de la auditoria</label>
                <Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Resultados de la auditoria..." className="border-border bg-input" rows={3} />
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4">
                <SignaturePad value={firmaAsignado} onChange={setFirmaAsignado} label="Firma del Asignado" />
                <SignaturePad value={firmaAuditor} onChange={setFirmaAuditor} label="Firma del Auditor" />
              </div>

              {error && <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editAudit ? 'Actualizar Auditoria' : 'Guardar Auditoria'}
                </Button>
              </div>
            </>
          )}

          {!selectedEquipo && searchSerie && searchResults.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">No se encontraron equipos con ese numero de serie</div>
          )}
        </CardContent>
      </Card>

      {viewingPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 cursor-pointer" onClick={() => setViewingPhoto(null)}>
          <img src={viewingPhoto} alt="Foto" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
