'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, Loader2, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  saveUsuarioIT,
  generarUsername,
  generarPIN,
  getUsuariosIT,
  type UsuarioIT,
  type Empleado,
} from '@/lib/firebase';
import {
  ARBOL_PERMISOS,
  type PermisoItem,
  type PermisosMap,
  permisosPorDefecto,
  todosPermisos,
  getChildrenKeys,
  hasDescendants,
} from '@/lib/permisos';

interface UserFormModalProps {
  empleados: Empleado[];
  existingUser: UsuarioIT | null;
  onClose: () => void;
}

function PermisoCheckbox({
  item,
  permisos,
  onChange,
  parentKey,
  depth = 0,
}: {
  item: PermisoItem;
  permisos: PermisosMap;
  onChange: (key: string, value: boolean) => void;
  parentKey?: string;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!item.children && item.children.length > 0;
  const childKeys = hasChildren ? (item.children || []).map(c => c.key) : [];
  const allChildrenChecked = childKeys.length > 0 && childKeys.every(k => permisos[k] === true);
  const someChildrenChecked = childKeys.some(k => permisos[k] === true);
  const isChecked = hasChildren ? allChildrenChecked : permisos[item.key] === true;
  const isIndeterminate = hasChildren && !allChildrenChecked && someChildrenChecked;
  const isITManager = item.key === 'itManager';

  const handleChange = () => {
    if (hasChildren) {
      const newVal = !allChildrenChecked;
      // Toggle all children
      for (const ck of childKeys) {
        onChange(ck, newVal);
      }
      // If toggling a section parent (rrhh, qa), also toggle the section key
      if (childKeys.length > 0) {
        onChange(item.key, newVal);
      }
    } else {
      onChange(item.key, !isChecked);
    }
    // If IT Manager, toggle everything
    if (isITManager) {
      const newVal = !permisos.itManager;
      toggleAll(newVal);
    }
  };

  const toggleAll = (val: boolean) => {
    const setAll = (list: PermisoItem[]) => {
      for (const i of list) {
        onChange(i.key, val);
        if (i.children) setAll(i.children);
      }
    };
    setAll(ARBOL_PERMISOS);
  };

  return (
    <div>
      <label
        className={cn(
          'flex items-center gap-2 py-1.5 px-1 rounded cursor-pointer hover:bg-muted/30 transition-colors',
          depth === 0 && 'font-medium',
          depth === 1 && 'pl-6 text-sm',
          depth === 2 && 'pl-10 text-sm text-muted-foreground',
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="h-5 w-5 flex items-center justify-center shrink-0"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <div className="h-5 w-5 shrink-0" />
        )}
        <input
          type="checkbox"
          checked={isChecked}
          ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
          onChange={handleChange}
          disabled={permisos.itManager && !isITManager}
          className={cn(
            'rounded border-border h-4 w-4 shrink-0',
            isITManager && 'text-primary border-primary',
          )}
        />
        {isITManager && <Shield className="h-4 w-4 text-primary shrink-0" />}
        <span className={cn(isITManager && 'text-primary font-semibold')}>
          {item.label}
        </span>
      </label>
      {hasChildren && expanded && (
        <div className="ml-3 border-l border-border/50 pl-2">
          {item.children!.map(child => (
            <PermisoCheckbox
              key={child.key}
              item={child}
              permisos={permisos}
              onChange={onChange}
              parentKey={item.key}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function UserFormModal({ empleados, existingUser, onClose }: UserFormModalProps) {
  const [codigoSearch, setCodigoSearch] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [permisos, setPermisos] = useState<PermisosMap>(() => permisosPorDefecto());
  const [preguntaSecreta, setPreguntaSecreta] = useState('');
  const [respuestaSecreta, setRespuestaSecreta] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'permisos'>('info');

  useEffect(() => {
    if (existingUser) {
      setCodigoSearch(existingUser.codigo);
      setUsername(existingUser.username);
      setPin(existingUser.pin);
      setPermisos(existingUser.permisos || permisosPorDefecto());
      setPreguntaSecreta(existingUser.preguntaSecreta?.question || '');
      setRespuestaSecreta(existingUser.preguntaSecreta?.answer || '');

      const emp = empleados.find(e => e.code === existingUser.codigo);
      if (emp) setSelectedEmpleado(emp);
    }
  }, [existingUser, empleados]);

  const handlePermisoChange = (key: string, value: boolean) => {
    setPermisos(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchEmpleado = () => {
    const emp = empleados.find(e => e.code === codigoSearch);
    if (emp) {
      setSelectedEmpleado(emp);
      const generatedUsername = generarUsername(emp);
      setUsername(generatedUsername);
      if (!existingUser) {
        setPin(generarPIN(codigoSearch));
      }
      setError('');
    } else {
      setSelectedEmpleado(null);
      setUsername('');
      setError('Codigo de empleado no encontrado');
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedEmpleado) {
        setError('Debe seleccionar un empleado');
        return;
      }
      if (!username.trim()) {
        setError('El nombre de usuario es requerido');
        return;
      }
      if (!pin || pin.length < 6) {
        setError('El PIN debe tener al menos 6 digitos');
        return;
      }

      if (!existingUser) {
        const existingUsers = await getUsuariosIT();
        if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          setError('Este nombre de usuario ya existe');
          return;
        }
      }

      setSaving(true);
      setError('');

      const rol: 'admin' | 'user' | 'it-manager' = permisos.itManager ? 'it-manager' : 'user';

      const usuario: UsuarioIT = {
        codigo: selectedEmpleado.code,
        username: username.trim().toLowerCase(),
        pin,
        rol,
        permisos,
        activo: existingUser ? existingUser.activo : true,
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        ...(preguntaSecreta && respuestaSecreta
          ? { preguntaSecreta: { question: preguntaSecreta, answer: respuestaSecreta } }
          : {}),
      };

      const success = await saveUsuarioIT(selectedEmpleado.code, usuario);
      setSaving(false);

      if (success) {
        onClose();
      } else {
        setError('Error al guardar el usuario. Revisa la consola para mas detalles.');
      }
    } catch (e) {
      console.error('Error saving user:', e);
      setSaving(false);
      setError('Error inesperado: ' + (e instanceof Error ? e.message : 'Error desconocido'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchEmpleado();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl border-primary/20 bg-card max-h-[90vh] flex flex-col">
        <CardHeader className="flex-row items-center justify-between border-b border-border shrink-0">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="h-5 w-5" />
            {existingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'info' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Informacion
            {activeTab === 'info' && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('permisos')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'permisos' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Permisos
            {activeTab === 'permisos' && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />}
          </button>
        </div>

        <CardContent className="p-6 overflow-y-auto overscroll-contain flex-1">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Buscar empleado por codigo */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <label className="mb-2 block text-sm font-medium text-primary">
                  Codigo de Trabajador *
                </label>
                <div className="flex gap-2">
                  <Input
                    value={codigoSearch}
                    onChange={(e) => setCodigoSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ej: 100001"
                    className="flex-1 border-border bg-input"
                    disabled={!!existingUser}
                  />
                  {!existingUser && (
                    <Button onClick={handleSearchEmpleado} className="bg-primary text-primary-foreground shrink-0">
                      <Search className="mr-2 h-4 w-4" />
                      Buscar
                    </Button>
                  )}
                </div>
              </div>

              {/* Datos autocompletados del empleado */}
              {selectedEmpleado && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Nombre</label>
                    <p className="font-medium text-foreground">{selectedEmpleado.nombres}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Apellido</label>
                    <p className="font-medium text-foreground">{selectedEmpleado.apellidos}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Area</label>
                    <p className="font-medium text-foreground">{selectedEmpleado.area}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Cargo</label>
                    <p className="font-medium text-foreground">{selectedEmpleado.cargo}</p>
                  </div>
                </div>
              )}

              {/* Username y PIN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-primary">
                    Usuario (generado automaticamente)
                  </label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="jperez_ti"
                    className="border-border bg-input font-mono"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formato: inicial + apellido + _ + area
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-primary">
                    PIN (codigo de trabajador) *
                  </label>
                  <Input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Codigo del trabajador"
                    maxLength={10}
                    className="border-border bg-input font-mono tracking-widest"
                  />
                </div>
              </div>

              {/* Pregunta secreta */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h4 className="mb-3 text-sm font-medium text-foreground">
                  Pregunta Secreta (opcional)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Pregunta</label>
                    <Input
                      value={preguntaSecreta}
                      onChange={(e) => setPreguntaSecreta(e.target.value)}
                      placeholder="Ej: Nombre de tu primera mascota"
                      className="border-border bg-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Respuesta</label>
                    <Input
                      value={respuestaSecreta}
                      onChange={(e) => setRespuestaSecreta(e.target.value)}
                      placeholder="Respuesta secreta"
                      className="border-border bg-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permisos' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecciona los permisos para este usuario. Marca "IT Manager" para acceso completo al sistema.
              </p>
              <div className="rounded-lg border border-border bg-muted/10 p-4">
                {ARBOL_PERMISOS.map(item => (
                  <PermisoCheckbox
                    key={item.key}
                    item={item}
                    permisos={permisos}
                    onChange={handlePermisoChange}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-3 w-3 rounded border border-border" />
                <span>Marcado parcial = algunos permisos del grupo activos</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-4 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedEmpleado}
            className="bg-primary text-primary-foreground"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingUser ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
