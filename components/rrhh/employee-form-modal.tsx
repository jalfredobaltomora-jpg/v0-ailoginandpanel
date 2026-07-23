'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User, Loader2, Camera, Edit2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PhotoCropper } from '@/components/rrhh/photo-cropper';
import {
  saveEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getEmpleadoByCodigo,
  type Empleado,
  type HistorialContractual,
  type UsuarioIT,
} from '@/lib/firebase';
import { tienePermisoEnGrupo } from '@/lib/permisos';

interface EmployeeFormModalProps {
  empleado: Empleado | null;
  onClose: () => void;
  onSaved: () => void;
  currentUser?: UsuarioIT | null;
}

// Formatear cedula con letra opcional: 000-000000-0000X
function formatCedula(value: string): string {
  const cleaned = value.replace(/[^0-9A-Za-z]/g, '');
  const digits = cleaned.replace(/[A-Za-z]/g, '');
  const letter = cleaned.match(/[A-Za-z]$/)?.[0]?.toUpperCase() || '';
  
  let formatted = '';
  for (let i = 0; i < Math.min(digits.length, 13); i++) {
    if (i === 3 || i === 9) formatted += '-';
    formatted += digits[i];
  }
  
  if (letter && digits.length >= 13) {
    formatted += letter;
  }
  
  return formatted;
}

// Extraer fecha de nacimiento de cedula nicaraguense: 000-DDMMYY-0000Q
function parseCedulaDate(cedula: string): string | null {
  const parts = cedula.split('-');
  if (parts.length !== 3) return null;
  const middle = parts[1];
  if (middle.length < 6) return null;
  const dd = middle.slice(0, 2);
  const mm = middle.slice(2, 4);
  const yy = middle.slice(4, 6);
  const day = parseInt(dd);
  const month = parseInt(mm);
  const yearTwoDigit = parseInt(yy);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const currentYear = new Date().getFullYear();
  const currentTwoDigit = currentYear % 100;
  const century = yearTwoDigit > currentTwoDigit ? 1900 : 2000;
  const year = century + yearTwoDigit;
  // Pad to YYYY-MM-DD
  return `${year}-${mm}-${dd}`;
}

export function EmployeeFormModal({ empleado, onClose, onSaved, currentUser }: EmployeeFormModalProps) {
  const [isEditing, setIsEditing] = useState(!empleado);
  const [isRenewing, setIsRenewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Empleado>({
    code: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    fechaNac: '',
    fechaIng: '',
    area: '',
    cargo: '',
    foto: '',
    activo: true,
    nacionalidad: 'nicaraguense',
    direccion: '',
    estadoCivil: 'soltero',
    hijos: 0,
    sexo: 'masculino',
    embarazada: false,
    semanasEmbarazo: 0,
    discapacidad: false,
    firstHireDate: '',
    firstEmployeeCode: '',
    renewalCount: 0,
  });

  useEffect(() => {
    if (empleado) {
      setFormData({
        code: empleado.code || '',
        nombres: empleado.nombres || '',
        apellidos: empleado.apellidos || '',
        cedula: empleado.cedula || '',
        fechaNac: empleado.fechaNac || '',
        fechaIng: empleado.fechaIng || '',
        area: empleado.area || '',
        cargo: empleado.cargo || '',
        foto: empleado.foto || '',
        activo: empleado.activo ?? true,
        nacionalidad: empleado.nacionalidad || 'nicaraguense',
        direccion: empleado.direccion || '',
        estadoCivil: empleado.estadoCivil || 'soltero',
        hijos: empleado.hijos ?? 0,
        sexo: empleado.sexo || 'masculino',
        embarazada: empleado.embarazada ?? false,
        semanasEmbarazo: empleado.semanasEmbarazo ?? 0,
        discapacidad: empleado.discapacidad ?? false,
        firstHireDate: empleado.firstHireDate || '',
        firstEmployeeCode: empleado.firstEmployeeCode || '',
        renewalCount: empleado.renewalCount ?? 0,
      });
    }
  }, [empleado]);

  const handleChange = (field: keyof Empleado, value: string | boolean | number) => {
    if (field === 'cedula' && typeof value === 'string') {
      setFormData(prev => {
        const isNi = prev.nacionalidad !== 'extranjero';
        const formatted = isNi ? formatCedula(value) : value;
        const updates: Partial<Empleado> = { cedula: formatted };
        if (isNi) {
          const parsed = parseCedulaDate(formatted);
          if (parsed) updates.fechaNac = parsed;
        }
        return { ...prev, ...updates };
      });
      return;
    }

    setFormData(prev => {
      let updates: Partial<Empleado> = { [field]: value };

      // If sexo changes to masculino, uncheck embarazada
      if (field === 'sexo' && value === 'masculino') {
        updates.embarazada = false;
        updates.semanasEmbarazo = 0;
      }

      // If semanasEmbarazo >= 40, auto-uncheck
      if (field === 'semanasEmbarazo' && typeof value === 'number' && value >= 40) {
        updates.embarazada = false;
      }

      // If unchecking embarazada, reset weeks
      if (field === 'embarazada' && value === false) {
        updates.semanasEmbarazo = 0;
      }

      return { ...prev, ...updates };
    });
  };

  const compressImageBase64 = (base64: string, maxSize = 300): Promise<string> => {
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
  };

  const compressImage = (file: File, maxSize = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
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
      img.src = url;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor seleccione una imagen valida');
      return;
    }

    setError('');
    setCropImageUrl(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (croppedBase64: string) => {
    const resized = await compressImageBase64(croppedBase64);
    setFormData(prev => ({ ...prev, foto: resized }));
    setCropImageUrl(null);
  };

  const handleCropCancel = () => {
    setCropImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError('El código de empleado es requerido');
      return;
    }
    if (!formData.nombres.trim() || !formData.apellidos.trim()) {
      setError('Nombres y apellidos son requeridos');
      return;
    }
    if (!formData.cedula.trim()) {
      setError('La cédula es requerida');
      return;
    }

    // Normalize code: trim whitespace
    const code = formData.code.trim();

    // Check for invalid Firebase path characters in code
    const invalidPathChars = /[.#$\[\]]/;
    if (invalidPathChars.test(code)) {
      setError('El código contiene caracteres no válidos (. # $ [ ])');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let success: boolean;

      if (empleado) {
        // Strip empty foto so we don't overwrite existing photo
        const saveData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries({ ...formData, code })) {
          if (k === 'foto' && !v) continue;
          if (v !== undefined && v !== null) saveData[k] = v;
        }

        if (isRenewing) {
          const currentDb = await getEmpleadoByCodigo(empleado.code);
          const oldCode = currentDb?.firstEmployeeCode || empleado.code;
          const oldHire = currentDb?.firstHireDate || empleado.fechaIng;
          saveData.firstHireDate = oldHire;
          saveData.firstEmployeeCode = oldCode;
          saveData.renewalCount = (currentDb?.renewalCount ?? 0) + 1;

          const historialEntry: HistorialContractual = {
            oldCode: empleado.code,
            newCode: code,
            oldFechaIng: empleado.fechaIng,
            newFechaIng: formData.fechaIng,
            timestamp: Date.now(),
          };
          const existing = currentDb?.historialContractual || empleado.historialContractual || [];
          saveData.historialContractual = [...existing, historialEntry];

          success = await updateEmpleado(code, saveData as Partial<Empleado>);
          if (success && code !== empleado.code) {
            await deleteEmpleado(empleado.code);
          }
        } else {
          saveData.firstHireDate = empleado.firstHireDate;
          saveData.firstEmployeeCode = empleado.firstEmployeeCode;
          saveData.renewalCount = empleado.renewalCount ?? 0;
          success = await updateEmpleado(code, saveData as Partial<Empleado>);
        }
      } else {
        const saveData = {
          ...formData,
          code,
          firstHireDate: formData.fechaIng,
          firstEmployeeCode: code,
          renewalCount: 0,
        };
        success = await saveEmpleado(code, saveData);
      }

      if (success) {
        onSaved();
        onClose();
        return;
      }
    } catch (e) {
      console.error('Error inesperado al guardar:', e);
      setSaving(false);
      setError('Error inesperado. Revisa la consola (F12).');
      return;
    }
    
    setSaving(false);
    setError('Error al guardar el empleado. Revisa la consola (F12) para mas detalles.');
  };

  const getInitials = () => {
    const n = formData.nombres?.charAt(0) || '';
    const a = formData.apellidos?.charAt(0) || '';
    return (n + a).toUpperCase() || 'EM';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl border-primary/20 bg-card max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex-row items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="h-5 w-5" />
            {empleado
              ? (isRenewing ? 'Renovar Contrato'
                : isEditing ? 'Editar Empleado'
                : 'Detalle de Empleado')
              : 'Nuevo Empleado'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {empleado && !isEditing && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setIsEditing(true); setIsRenewing(false); }}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setIsEditing(true); setIsRenewing(true); }}
                  className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renovar Contrato
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Photo Section */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/30">
                <AvatarImage src={formData.foto} alt={formData.nombres} />
                <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Código de Empleado *
              </label>
              <Input
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="100001"
                className="border-border bg-input font-mono"
                disabled={!isEditing || (!!empleado && !isRenewing)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Cédula * (000-000000-0000X)
              </label>
              <Input
                value={formData.cedula}
                onChange={(e) => handleChange('cedula', e.target.value)}
                placeholder="001-010190-0001A"
                className="border-border bg-input font-mono"
                disabled={!isEditing}
                maxLength={16}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Nombres *
              </label>
              <Input
                value={formData.nombres}
                onChange={(e) => handleChange('nombres', e.target.value)}
                placeholder="Juan Carlos"
                className="border-border bg-input"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Apellidos *
              </label>
              <Input
                value={formData.apellidos}
                onChange={(e) => handleChange('apellidos', e.target.value)}
                placeholder="Perez Lopez"
                className="border-border bg-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Fecha de Nacimiento
              </label>
              <Input
                type="date"
                value={formData.fechaNac}
                onChange={(e) => handleChange('fechaNac', e.target.value)}
                className="border-border bg-input"
                disabled={!isEditing || formData.nacionalidad === 'nicaraguense'}
              />
              {isEditing && formData.nacionalidad === 'nicaraguense' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Se genera automáticamente desde la cédula
                </p>
              )}
              {isEditing && formData.nacionalidad === 'extranjero' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ingrese la fecha manualmente
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Fecha de Ingreso
              </label>
              <Input
                type="date"
                value={formData.fechaIng}
                onChange={(e) => handleChange('fechaIng', e.target.value)}
                className="border-border bg-input"
                disabled={!isEditing || (!!empleado && !isRenewing)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Nacionalidad
              </label>
              <Select
                value={formData.nacionalidad}
                onValueChange={(v) => handleChange('nacionalidad', v)}
                disabled={!isEditing}
              >
                <SelectTrigger className="border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="nicaraguense">Nicaraguense</SelectItem>
                    <SelectItem value="extranjero">Extranjero</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Sexo
              </label>
              <Select
                value={formData.sexo}
                onValueChange={(v) => handleChange('sexo', v)}
                disabled={!isEditing}
              >
                <SelectTrigger className="border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Estado Civil
              </label>
              <Select
                value={formData.estadoCivil}
                onValueChange={(v) => handleChange('estadoCivil', v)}
                disabled={!isEditing}
              >
                <SelectTrigger className="border-border bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="soltero">Soltero(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viudo">Viudo(a)</SelectItem>
                    <SelectItem value="union-libre">Union Libre</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Área
              </label>
              <Input
                value={formData.area}
                onChange={(e) => handleChange('area', e.target.value)}
                placeholder="TI"
                className="border-border bg-input"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Cargo
              </label>
              <Input
                value={formData.cargo}
                onChange={(e) => handleChange('cargo', e.target.value)}
                placeholder="Desarrollador"
                className="border-border bg-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Direccion Domiciliar
              </label>
              <Input
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                placeholder="Direccion completa"
                className="border-border bg-input"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-primary">
                Hijos
              </label>
              <Input
                type="number"
                min={0}
                value={formData.hijos}
                onChange={(e) => handleChange('hijos', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="border-border bg-input"
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Conditional fields */}
          {isEditing && (
            <div className="grid grid-cols-2 gap-4">
              {formData.sexo === 'femenino' && (
                <div className="flex items-center space-x-2 rounded-lg border border-border bg-muted/30 p-4">
                  <Checkbox
                    id="embarazada"
                    checked={formData.embarazada}
                    onCheckedChange={(checked) => handleChange('embarazada', !!checked)}
                  />
                  <label
                    htmlFor="embarazada"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Embarazada
                  </label>
                </div>
              )}
              {formData.embarazada && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    Semanas de embarazo:
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={42}
                    value={formData.semanasEmbarazo || ''}
                    onChange={(e) => handleChange('semanasEmbarazo', e.target.value === '' ? 0 : Math.min(42, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-20 border-border bg-input text-center"
                  />
                  <span className="text-xs text-muted-foreground">(1-42 semanas)</span>
                </div>
              )}
              <div className={`flex items-center space-x-2 rounded-lg border border-border bg-muted/30 p-4 ${!formData.embarazada && formData.sexo === 'femenino' ? '' : 'col-start-1'}`}>
                <Checkbox
                  id="discapacidad"
                  checked={formData.discapacidad}
                  onCheckedChange={(checked) => handleChange('discapacidad', !!checked)}
                />
                <label
                  htmlFor="discapacidad"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Discapacidad
                </label>
              </div>
            </div>
          )}

          {/* Personal Inactivo Checkbox */}
          {isEditing && (
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-muted/30 p-4">
              <Checkbox
                id="inactivo"
                checked={!formData.activo}
                onCheckedChange={(checked) => handleChange('activo', !checked)}
              />
              <label
                htmlFor="inactivo"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Personal Inactivo
              </label>
            </div>
          )}

          {/* Status badge when not editing */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <span className="text-xs text-muted-foreground">Estado:</span>
                <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
                  formData.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {formData.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Nacionalidad:</span>
                <span className="ml-2 text-sm font-medium text-foreground">
                  {formData.nacionalidad === 'nicaraguense' ? 'Nicaraguense' : 'Extranjero'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Sexo:</span>
                <span className="ml-2 text-sm font-medium text-foreground capitalize">{formData.sexo}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Estado Civil:</span>
                <span className="ml-2 text-sm font-medium text-foreground">
                  {formData.estadoCivil === 'soltero' ? 'Soltero(a)' :
                   formData.estadoCivil === 'casado' ? 'Casado(a)' :
                   formData.estadoCivil === 'divorciado' ? 'Divorciado(a)' :
                   formData.estadoCivil === 'viudo' ? 'Viudo(a)' :
                   formData.estadoCivil === 'union-libre' ? 'Union Libre' : formData.estadoCivil}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Hijos:</span>
                <span className="ml-2 text-sm font-medium text-foreground">{formData.hijos}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Discapacidad:</span>
                <span className={`ml-2 text-sm font-medium ${formData.discapacidad ? 'text-amber-500' : 'text-foreground'}`}>
                  {formData.discapacidad ? 'Si' : 'No'}
                </span>
              </div>
              {formData.embarazada && (
                <div>
                  <span className="text-xs text-muted-foreground">Embarazo:</span>
                  <span className="ml-2 text-sm font-medium text-pink-500">
                    {formData.semanasEmbarazo} semanas
                  </span>
                </div>
              )}
              {formData.direccion && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Direccion:</span>
                  <span className="ml-2 text-sm font-medium text-foreground">{formData.direccion}</span>
                </div>
              )}
              {(formData.firstHireDate || formData.renewalCount) && (
                <>
                  <div className="col-span-2 border-t border-border/30 my-1 pt-2">
                    <span className="text-xs font-semibold text-amber-500">Historial de Contratos</span>
                  </div>
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-xs text-muted-foreground">1er Ingreso:</span>
                      <span className="ml-2 text-sm font-medium text-foreground">
                        {formData.firstHireDate || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">1er Código:</span>
                      <span className="ml-2 text-sm font-medium text-foreground">
                        {formData.firstEmployeeCode || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Renovaciones:</span>
                      <span className="ml-2 text-sm font-medium text-amber-500">
                        {formData.renewalCount ?? 0}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {(formData.historialContractual && formData.historialContractual.length > 0 && currentUser && (currentUser.rol === 'admin' || currentUser.permisos?.itManager || tienePermisoEnGrupo(currentUser, 'rrhh_catalogo_'))) && (
                <>
                  <div className="col-span-2 border-t border-border/30 my-1 pt-2">
                    <span className="text-xs font-semibold text-blue-500">Expediente de Renovaciones</span>
                  </div>
                  <div className="col-span-2 max-h-40 overflow-y-auto space-y-1">
                    {[...formData.historialContractual].reverse().map((entry, i) => (
                      <div key={i} className="rounded border border-border/30 bg-muted/10 p-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                          <span className="text-primary font-medium">#{formData.historialContractual!.length - i}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                          <span>Carné anterior: <span className="font-mono text-amber-500">{entry.oldCode}</span></span>
                          <span>Carné nuevo: <span className="font-mono text-green-500">{entry.newCode}</span></span>
                          <span>Ingreso anterior: <span className="text-amber-500">{entry.oldFechaIng}</span></span>
                          <span>Nuevo ingreso: <span className="text-green-500">{entry.newFechaIng}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

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
                {empleado ? 'Guardar Cambios' : 'Crear Empleado'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Photo Cropper Modal */}
      {cropImageUrl && (
        <PhotoCropper
          imageUrl={cropImageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
