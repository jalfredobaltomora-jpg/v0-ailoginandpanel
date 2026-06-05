'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Camera, Tablet, Scan } from 'lucide-react';
import { SignaturePad } from './signature-pad';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  saveEquipoInventario,
  updateEquipoInventario,
  getEmpleadosActivos,
  type EquipoInventario,
  type Empleado,
} from '@/lib/firebase';

interface EquipmentFormModalProps {
  equipo: EquipoInventario | null;
  onClose: () => void;
  onSaved: () => void;
}

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

export function EquipmentFormModal({ equipo, onClose, onSaved }: EquipmentFormModalProps) {
  const [isEditing, setIsEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const defaultFotos = { lateralIzquierdo: '', lateralDerecho: '', frontal: '', trasero: '' };

  const getDefaultMes = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState<EquipoInventario>({
    id: '',
    tipo: 'tablet',
    serialNumber: '',
    marca: '',
    modelo: '',
    estado: '',
    accesorios: { usbCable: false, chargerCube: false, microSDTrayKey: false, cableOTG: false },
    empleadoAsignado: '',
    fotos: { ...defaultFotos },
    historial: [],
    firma: '',
    fechaAsignacion: new Date().toISOString().split('T')[0],
    mesInventario: getDefaultMes(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  useEffect(() => {
    getEmpleadosActivos().then(setEmpleados);
  }, []);

  useEffect(() => {
    if (equipo) {
      setFormData({
        id: equipo.id || '',
        tipo: equipo.tipo || 'tablet',
        serialNumber: equipo.serialNumber || '',
        marca: equipo.marca || '',
        modelo: equipo.modelo || '',
        estado: equipo.estado || '',
        accesorios: {
          usbCable: equipo.accesorios?.usbCable ?? false,
          chargerCube: equipo.accesorios?.chargerCube ?? false,
          microSDTrayKey: equipo.accesorios?.microSDTrayKey ?? false,
          cableOTG: equipo.accesorios?.cableOTG ?? false,
        },
        empleadoAsignado: equipo.empleadoAsignado || '',
        fotos: equipo.fotos ? { ...defaultFotos, ...equipo.fotos } : { ...defaultFotos },
        historial: equipo.historial || [],
        firma: equipo.firma || '',
        fechaAsignacion: equipo.fechaAsignacion || new Date().toISOString().split('T')[0],
        mesInventario: equipo.mesInventario || getDefaultMes(),
        createdAt: equipo.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
  }, [equipo]);

  const handleChange = (field: keyof EquipoInventario, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAccesorioChange = (key: keyof typeof formData.accesorios, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      accesorios: { ...prev.accesorios, [key]: checked },
    }));
  };

  const handlePhotoUpload = (slot: keyof typeof defaultFotos, autoAdvance = false) => {
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (isMobile) input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('Por favor seleccione una imagen valida');
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onload = async () => {
        const resized = await compressImageBase64(reader.result as string);
        setFormData(prev => ({ ...prev, fotos: { ...prev.fotos, [slot]: resized } }));
        if (autoAdvance) {
          const slotOrder: (keyof typeof defaultFotos)[] = ['frontal', 'trasero', 'lateralIzquierdo', 'lateralDerecho'];
          const currentIdx = slotOrder.indexOf(slot);
          const nextRemaining = slotOrder.slice(currentIdx + 1);
          if (nextRemaining.length > 0) {
            setTimeout(() => handlePhotoUpload(nextRemaining[0], true), 400);
          }
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removePhoto = (slot: keyof typeof defaultFotos) => {
    setFormData(prev => ({ ...prev, fotos: { ...prev.fotos, [slot]: '' } }));
  };

  const getEmpleadoNombre = (code: string) => {
    if (!code) return 'Sin asignar';
    const emp = empleados.find(e => e.code === code);
    return emp ? `${emp.nombres} ${emp.apellidos}` : '';
  };

  const empleadoNombre = getEmpleadoNombre(formData.empleadoAsignado);

  const handleSave = async () => {
    if (!formData.serialNumber.trim()) {
      setError('El numero de serie es requerido');
      return;
    }


    setSaving(true);
    setError('');

    try {
      const now = Date.now();
      const data = { ...formData, updatedAt: now };

      let success: boolean;
      if (equipo) {
        success = await updateEquipoInventario(equipo.id, data);
      } else {
        const id = await saveEquipoInventario(data);
        success = !!id;
      }

      if (success) {
        onSaved();
        onClose();
        return;
      }
    } catch (e) {
      console.error('Error al guardar equipo:', e);
      setSaving(false);
      setError('Error inesperado. Revisa la consola (F12).');
      return;
    }

    setSaving(false);
    setError('Error al guardar el equipo. Revisa la consola (F12) para mas detalles.');
  };

  const fotoSlots: { key: keyof typeof defaultFotos; label: string }[] = [
    { key: 'frontal', label: 'Frontal' },
    { key: 'trasero', label: 'Trasero' },
    { key: 'lateralIzquierdo', label: 'Lateral Izq.' },
    { key: 'lateralDerecho', label: 'Lateral Der.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center gap-2 text-primary">
            {formData.tipo === 'tablet' ? <Tablet className="h-5 w-5" /> : <Scan className="h-5 w-5" />}
            {equipo ? 'Editar Equipo' : 'Nuevo Equipo'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Tipo de Equipo - Radio buttons */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Tipo de Equipo
            </label>
            <div className="flex gap-6">
              <label className={`flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                !isEditing ? 'opacity-60 cursor-not-allowed' :
                formData.tipo === 'tablet' ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-primary/50'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="tablet"
                  checked={formData.tipo === 'tablet'}
                  onChange={() => isEditing && handleChange('tipo', 'tablet')}
                  className="accent-primary"
                  disabled={!isEditing}
                />
                <Tablet className="h-5 w-5 text-primary" />
                <span className="font-medium">Tablet</span>
              </label>
              <label className={`flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                !isEditing ? 'opacity-60 cursor-not-allowed' :
                formData.tipo === 'scanner' ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-primary/50'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="scanner"
                  checked={formData.tipo === 'scanner'}
                  onChange={() => isEditing && handleChange('tipo', 'scanner')}
                  className="accent-primary"
                  disabled={!isEditing}
                />
                <Scan className="h-5 w-5 text-primary" />
                <span className="font-medium">Scanner</span>
              </label>
            </div>
          </div>

          {/* Codigo de trabajador */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Codigo de Trabajador
            </label>
            <Select
              value={formData.empleadoAsignado}
              onValueChange={(v) => handleChange('empleadoAsignado', v === '__unassigned__' ? '' : v)}
              disabled={!isEditing}
            >
              <SelectTrigger className="border-border bg-input">
                <SelectValue placeholder="Seleccionar empleado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__unassigned__">Sin asignar</SelectItem>
                  {empleados.map(emp => (
                    <SelectItem key={emp.code} value={emp.code}>
                      {emp.code} - {emp.nombres} {emp.apellidos}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Nombre Completo (auto) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Nombre Completo
            </label>
            <Input
              value={empleadoNombre}
              readOnly
              placeholder="Seleccione un codigo de trabajador"
              className="border-border bg-muted/50 text-foreground"
            />
          </div>

          {/* Marca del equipo */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Marca del Equipo
            </label>
            <Input
              value={formData.marca}
              onChange={(e) => handleChange('marca', e.target.value)}
              placeholder="Samsung, Honeywell, Zebra, ..."
              className="border-border bg-input"
              disabled={!isEditing}
            />
          </div>

          {/* Modelo */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Modelo
            </label>
            <Input
              value={formData.modelo}
              onChange={(e) => handleChange('modelo', e.target.value)}
              placeholder="Galaxy Tab A, CK65, TC21, ..."
              className="border-border bg-input"
              disabled={!isEditing}
            />
          </div>

          {/* Numero de Serie */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Numero de Serie *
            </label>
            <Input
              value={formData.serialNumber}
              onChange={(e) => handleChange('serialNumber', e.target.value)}
              placeholder="SN-001"
              className="border-border bg-input font-mono"
              disabled={!isEditing}
            />
          </div>

          {/* Comentario */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Comentario
            </label>
            <Textarea
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              placeholder="Buen estado, con algunos detalles esteticos..."
              className="border-border bg-input"
              disabled={!isEditing}
              rows={3}
            />
          </div>

          {/* Accesorios */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">
              Accesorios {formData.tipo === 'scanner' && <span className="text-muted-foreground font-normal">(Scanner)</span>}
            </label>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              {formData.tipo === 'tablet' ? (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="usbCable"
                      checked={formData.accesorios.usbCable}
                      onCheckedChange={(checked) => handleAccesorioChange('usbCable', !!checked)}
                      disabled={!isEditing}
                    />
                    <label htmlFor="usbCable" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Cable USB
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="chargerCube"
                      checked={formData.accesorios.chargerCube}
                      onCheckedChange={(checked) => handleAccesorioChange('chargerCube', !!checked)}
                      disabled={!isEditing}
                    />
                    <label htmlFor="chargerCube" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Cubo Cargador
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="microSDTrayKey"
                      checked={formData.accesorios.microSDTrayKey}
                      onCheckedChange={(checked) => handleAccesorioChange('microSDTrayKey', !!checked)}
                      disabled={!isEditing}
                    />
                    <label htmlFor="microSDTrayKey" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Llave de Bandeja MicroSD
                    </label>
                  </div>
                </>
              ) : null}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cableOTG"
                  checked={formData.accesorios.cableOTG}
                  onCheckedChange={(checked) => handleAccesorioChange('cableOTG', !!checked)}
                  disabled={!isEditing}
                />
                <label htmlFor="cableOTG" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Cable OTG
                </label>
              </div>
            </div>
          </div>

          {/* Fotos del Equipo - Frontal, Trasero, Lateral Izq, Lateral Der */}
          <div>
            <label className="mb-3 block text-sm font-medium text-primary">
              Fotos del Equipo
            </label>
            <div className="grid grid-cols-4 gap-3">
              {fotoSlots.map(({ key, label }) => (
                <div key={key} className="relative flex flex-col items-center gap-1">
                  <div
                    className={`relative flex h-28 w-full items-center justify-center rounded-lg border-2 overflow-hidden ${
                      formData.fotos[key]
                        ? 'border-primary/30 bg-muted/20'
                        : 'border-dashed border-muted-foreground/30 bg-muted/10'
                    }`}
                  >
                    {formData.fotos[key] ? (
                      <>
                        <img
                          src={formData.fotos[key]}
                          alt={label}
                          className="h-full w-full object-cover cursor-pointer"
                          onClick={() => setViewingPhoto(formData.fotos[key])}
                        />
                        {isEditing && (
                          <button
                            onClick={() => removePhoto(key)}
                            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground text-xs hover:bg-destructive"
                          >
                            X
                          </button>
                        )}
                      </>
                    ) : isEditing ? (
                      <button
                        onClick={() => handlePhotoUpload(key, true)}
                        className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Camera className="h-6 w-6" />
                        <span className="text-[10px] leading-tight text-center">Tomar foto</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        <Camera className="h-6 w-6" />
                        <span className="text-[10px] leading-tight text-center">Sin foto</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo viewer */}
          {viewingPhoto && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-pointer"
              onClick={() => setViewingPhoto(null)}
            >
              <img src={viewingPhoto} alt="Foto" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            </div>
          )}

          {/* Firma */}
          <SignaturePad
            value={formData.firma || ''}
            onChange={(v) => handleChange('firma', v)}
            label="Firma de recibido del equipo"
          />

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          {isEditing && (
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
