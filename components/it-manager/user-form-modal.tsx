'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  saveUsuarioIT,
  generarUsername,
  generarPIN,
  getUsuariosIT,
  type UsuarioIT,
  type Empleado,
} from '@/lib/firebase';

interface UserFormModalProps {
  empleados: Empleado[];
  existingUser: UsuarioIT | null;
  onClose: () => void;
}

export function UserFormModal({ empleados, existingUser, onClose }: UserFormModalProps) {
  const [codigoSearch, setCodigoSearch] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState<'admin' | 'user' | 'it-manager'>('user');
  const [preguntaSecreta, setPreguntaSecreta] = useState('');
  const [respuestaSecreta, setRespuestaSecreta] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingUser) {
      setCodigoSearch(existingUser.codigo);
      setUsername(existingUser.username);
      setPin(existingUser.pin);
      setRol(existingUser.rol);
      setPreguntaSecreta(existingUser.preguntaSecreta?.question || '');
      setRespuestaSecreta(existingUser.preguntaSecreta?.answer || '');
      
      const emp = empleados.find(e => e.code === existingUser.codigo);
      if (emp) setSelectedEmpleado(emp);
    }
  }, [existingUser, empleados]);

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

    // Check if username already exists (for new users)
    if (!existingUser) {
      const existingUsers = await getUsuariosIT();
      if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        setError('Este nombre de usuario ya existe');
        return;
      }
    }

    setSaving(true);
    setError('');

    const usuario: UsuarioIT = {
      codigo: selectedEmpleado.code,
      username: username.trim().toLowerCase(),
      pin,
      rol,
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
      setError('Error al guardar el usuario');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl border-primary/20 bg-card">
        <CardHeader className="flex-row items-center justify-between border-b border-border">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="h-5 w-5" />
            {existingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Buscar empleado por codigo */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <label className="mb-2 block text-sm font-medium text-primary">
              Codigo de Trabajador *
            </label>
            <div className="flex gap-2">
              <Input
                value={codigoSearch}
                onChange={(e) => setCodigoSearch(e.target.value)}
                placeholder="Ej: 100001"
                className="flex-1 border-border bg-input"
                disabled={!!existingUser}
              />
              {!existingUser && (
                <Button onClick={handleSearchEmpleado} className="bg-primary text-primary-foreground">
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

          {/* Rol */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as typeof rol)}
              className="w-full rounded-md border border-border bg-input p-2 text-foreground"
            >
              <option value="user">Usuario</option>
              <option value="it-manager">IT Manager</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Pregunta secreta (opcional) */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <h4 className="mb-3 text-sm font-medium text-foreground">
              Pregunta Secreta (opcional - para verificacion de identidad)
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

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
