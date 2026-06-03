'use client';

import { useState } from 'react';
import { X, Loader2, Camera, Brain, Check, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { updateEquipoInventario, type EquipoInventario } from '@/lib/firebase';
import { analyzeFotos } from '@/lib/ai-client';
import { SignaturePad } from './signature-pad';

interface ReinspectionModalProps {
  equipo: EquipoInventario;
  empleadoNombre: string;
  onClose: () => void;
  onEdit: () => void;
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
};

export function ReinspectionModal({ equipo, empleadoNombre, onClose, onEdit, onSaved }: ReinspectionModalProps) {
  const [fotos, setFotos] = useState({ ...defaultFotos });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ score: number; analisis: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [firma, setFirma] = useState('');

  // Validation checkboxes - all start unchecked
  const [checks, setChecks] = useState({
    tipo: false,
    codigo: false,
    nombre: false,
    marca: false,
    modelo: false,
    serie: false,
    comentario: false,
    accesorios: false,
  });

  const allChecked = Object.values(checks).every(Boolean);

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

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    const r = await analyzeFotos(fotos);
    if (r) {
      setResult(r);
    } else {
      setError('No se pudo analizar. Intenta de nuevo.');
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const hasNewFotos = Object.values(fotos).some(Boolean);
    const ok = await updateEquipoInventario(equipo.id, {
      ...(hasNewFotos ? { fotos: fotos as EquipoInventario['fotos'] } : {}),
      ...(firma ? { firma } : {}),
      historial: [
        ...(equipo.historial || []),
        {
          mes: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          fotos: hasNewFotos ? fotos as EquipoInventario['fotos'] : { ...defaultFotos },
          comentarios: 'Reinspeccion validada',
          scoreJAB: result?.score ?? -1,
          timestamp: Date.now(),
          firma: firma || undefined,
        },
      ],
    });
    setSaving(false);
    if (ok) { onSaved(); onClose(); }
    else setError('Error al guardar. Intenta de nuevo.');
  };

  const tipoLabel = equipo.tipo === 'tablet' ? 'Tablet' : 'Scanner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <ClipboardCheck className="h-5 w-5" />
            Reinspeccion de Inventario
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <p className="text-sm text-muted-foreground">
            Equipo: <strong>{equipo.serialNumber}</strong> &mdash;{' '}
            <strong>{empleadoNombre || 'Sin asignar'}</strong>
          </p>

          {/* Validation fields */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <h4 className="text-sm font-semibold text-primary">Validar datos del equipo</h4>

            <FieldCheck
              label="Tipo de Equipo"
              value={tipoLabel}
              checked={checks.tipo}
              onCheck={(v) => setChecks(prev => ({ ...prev, tipo: v }))}
            />
            <FieldCheck
              label="Codigo de Trabajador"
              value={equipo.empleadoAsignado || 'Sin asignar'}
              checked={checks.codigo}
              onCheck={(v) => setChecks(prev => ({ ...prev, codigo: v }))}
            />
            <FieldCheck
              label="Nombre Completo"
              value={empleadoNombre || 'Sin asignar'}
              checked={checks.nombre}
              onCheck={(v) => setChecks(prev => ({ ...prev, nombre: v }))}
            />
            <FieldCheck
              label="Marca del Equipo"
              value={equipo.marca || '-'}
              checked={checks.marca}
              onCheck={(v) => setChecks(prev => ({ ...prev, marca: v }))}
            />
            <FieldCheck
              label="Modelo"
              value={equipo.modelo || '-'}
              checked={checks.modelo}
              onCheck={(v) => setChecks(prev => ({ ...prev, modelo: v }))}
            />
            <FieldCheck
              label="Numero de Serie"
              value={equipo.serialNumber}
              checked={checks.serie}
              onCheck={(v) => setChecks(prev => ({ ...prev, serie: v }))}
            />
            <FieldCheck
              label="Comentario"
              value={equipo.estado || 'Sin comentarios'}
              checked={checks.comentario}
              onCheck={(v) => setChecks(prev => ({ ...prev, comentario: v }))}
            />
            <FieldCheck
              label="Accesorios"
              value={Object.entries(equipo.accesorios)
                .filter(([k, v]) => v && accesorioLabels[k])
                .map(([k]) => accesorioLabels[k])
                .join(', ') || 'Ninguno'}
              checked={checks.accesorios}
              onCheck={(v) => setChecks(prev => ({ ...prev, accesorios: v }))}
            />
          </div>

          {/* Fotos */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Fotos del equipo (tomar nuevas si hay cambios)</label>
            <div className="grid grid-cols-4 gap-2">
              {fotoSlots.map(({ key, label }) => (
                <div key={key} className="relative flex flex-col items-center gap-1">
                  <div className={`relative flex h-24 w-full items-center justify-center rounded-lg border-2 overflow-hidden ${
                    fotos[key] ? 'border-primary/30' :
                    equipo.fotos?.[key] ? 'border-muted-foreground/30 bg-muted/20' : 'border-dashed border-muted-foreground/30 bg-muted/10'
                  }`}>
                    {fotos[key] ? (
                      <img src={fotos[key]} alt={label} className="h-full w-full object-cover cursor-pointer" onClick={() => setViewingPhoto(fotos[key])} />
                    ) : equipo.fotos?.[key] ? (
                      <img src={equipo.fotos[key]} alt={label} className="h-full w-full object-cover opacity-60 cursor-pointer" onClick={() => setViewingPhoto(equipo.fotos[key])} />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px]">Sin foto</span>
                      </div>
                    )}
                    <button
                      onClick={() => handlePhotoUpload(key)}
                      className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/80 text-primary-foreground text-xs hover:bg-primary"
                      title="Tomar nueva foto"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analisis JAB */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Analisis JAB</label>
            <div className="flex items-center gap-3">
              <Button onClick={handleAnalyze} disabled={analyzing || !Object.values(fotos).some(Boolean)} variant="outline" size="sm">
                {analyzing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Brain className="mr-1 h-3 w-3" />}
                Analizar
              </Button>
              {result && (
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {result.score}%
                  </div>
                  <span className="text-xs text-muted-foreground">{result.analisis}</span>
                </div>
              )}
            </div>
          </div>

          {error && <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

          {/* Firma */}
          <SignaturePad
            value={firma}
            onChange={setFirma}
            label="Firma del supervisor que realiza la reinspeccion"
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => { onClose(); onEdit(); }}
              className="border-border"
            >
              Actualizar Datos
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !allChecked || !firma}
              className="bg-primary text-primary-foreground"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!allChecked ? 'Valida todos los campos' : !firma ? 'Firma requerida' : 'Confirmar Reinspeccion'}
            </Button>
          </div>
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

function FieldCheck({ label, value, checked, onCheck }: {
  label: string;
  value: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card p-2">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheck(!!v)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
