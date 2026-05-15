'use client';

import { useState } from 'react';
import { Search, Eye, EyeOff, User, Key, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getEmpleadoByCodigo, getUsuariosIT, type Empleado, type UsuarioIT } from '@/lib/firebase';

type RevealOption = 'username' | 'password' | 'both' | null;

function calculateAge(fechaNac: string): number {
  const birth = new Date(fechaNac);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function ValidationPanel() {
  const [codigo, setCodigo] = useState('');
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [usuario, setUsuario] = useState<UsuarioIT | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealOption, setRevealOption] = useState<RevealOption>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSearch = async () => {
    if (!codigo.trim()) return;

    setLoading(true);
    setError('');
    setEmpleado(null);
    setUsuario(null);
    setRevealOption(null);
    setRevealed(false);

    try {
      const emp = await getEmpleadoByCodigo(codigo.trim());
      if (!emp) {
        setError('Codigo de trabajador no encontrado');
        setLoading(false);
        return;
      }
      setEmpleado(emp);

      const usuarios = await getUsuariosIT();
      const user = usuarios.find(u => u.codigo === codigo.trim());
      setUsuario(user || null);
    } catch {
      setError('Error al buscar el codigo');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  return (
    <div className="flex w-80 flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <h3 className="text-sm font-semibold text-primary">Validacion de Identidad</h3>
        <p className="text-xs text-muted-foreground">
          Verifique datos del trabajador
        </p>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* Codigo Input */}
        <div className="flex gap-2">
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Codigo de trabajador"
            className="flex-1 border-border bg-input text-sm"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Employee Info */}
        {empleado && (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-semibold text-primary">Datos del Empleado</p>
              <div className="space-y-1.5 text-xs text-foreground">
                <p><span className="text-muted-foreground">Nombre:</span> {empleado.nombres} {empleado.apellidos}</p>
                <p><span className="text-muted-foreground">Edad:</span> {calculateAge(empleado.fechaNac)} años</p>
                <p><span className="text-muted-foreground">Fecha Ingreso:</span> {empleado.fechaIng}</p>
              </div>
            </div>

            {/* Security Question */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-semibold text-primary">Pregunta de Seguridad</p>
              {usuario?.preguntaSecreta ? (
                <p className="text-xs text-foreground">{usuario.preguntaSecreta.question}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No tiene pregunta de seguridad configurada</p>
              )}
            </div>

            {/* Reveal Controls */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-semibold text-primary">Desea ver:</p>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-primary/10">
                  <input
                    type="radio"
                    name="reveal"
                    checked={revealOption === 'username'}
                    onChange={() => { setRevealOption('username'); setRevealed(false); }}
                    className="text-primary"
                  />
                  <User className="h-3 w-3 text-muted-foreground" />
                  Usuario
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-primary/10">
                  <input
                    type="radio"
                    name="reveal"
                    checked={revealOption === 'password'}
                    onChange={() => { setRevealOption('password'); setRevealed(false); }}
                    className="text-primary"
                  />
                  <Key className="h-3 w-3 text-muted-foreground" />
                  Contraseña
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-primary/10">
                  <input
                    type="radio"
                    name="reveal"
                    checked={revealOption === 'both'}
                    onChange={() => { setRevealOption('both'); setRevealed(false); }}
                    className="text-primary"
                  />
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  Ambos
                </label>
              </div>

              <Button
                size="sm"
                onClick={handleReveal}
                disabled={!revealOption || !usuario}
                className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Eye className="mr-1 h-3 w-3" />
                Revelar
              </Button>

              {!usuario && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Este trabajador no tiene credenciales de sistema
                </p>
              )}
            </div>

            {/* Revealed Data */}
            {revealed && revealOption && usuario && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <p className="mb-2 text-xs font-semibold text-green-500">Datos Revelados</p>
                <div className="space-y-1.5 text-xs">
                  {(revealOption === 'username' || revealOption === 'both') && (
                    <p className="flex items-center gap-2">
                      <User className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Usuario:</span>
                      <span className="font-mono font-medium text-foreground">{usuario.username}</span>
                    </p>
                  )}
                  {(revealOption === 'password' || revealOption === 'both') && (
                    <p className="flex items-center gap-2">
                      <Key className="h-3 w-3 text-yellow-500" />
                      <span className="text-muted-foreground">Contraseña:</span>
                      <span className="font-mono font-medium text-foreground">{usuario.pin}</span>
                    </p>
                  )}
                </div>
                {revealOption === 'both' && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nota: La IA solo debe revelar un dato a la vez segun lo solicitado por el usuario
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
