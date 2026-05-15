'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, Edit, Trash2, Key, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserFormModal } from '@/components/it-manager/user-form-modal';
import {
  getUsuariosIT,
  getEmpleados,
  deleteUsuarioIT,
  saveUsuarioIT,
  generarPIN,
  type UsuarioIT,
  type Empleado,
} from '@/lib/firebase';

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioIT[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioIT | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [usrs, emps] = await Promise.all([getUsuariosIT(), getEmpleados()]);
    setUsuarios(usrs);
    setEmpleados(emps);
    setLoading(false);
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
      router.push('/');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.rol !== 'it-manager' && user.rol !== 'admin') {
      router.push('/panel');
      return;
    }
    loadData();
  }, [router]);

  const handleDelete = async (codigo: string) => {
    if (confirm('Esta seguro de eliminar este usuario?')) {
      await deleteUsuarioIT(codigo);
      loadData();
    }
  };

  const handleResetPIN = async (usuario: UsuarioIT) => {
    const newPin = generarPIN();
    await saveUsuarioIT(usuario.codigo, { ...usuario, pin: newPin });
    alert(`Nuevo PIN para ${usuario.username}: ${newPin}`);
    loadData();
  };

  const handleToggleActive = async (usuario: UsuarioIT) => {
    await saveUsuarioIT(usuario.codigo, { ...usuario, activo: !usuario.activo });
    loadData();
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (usuario: UsuarioIT) => {
    setEditingUser(usuario);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    loadData();
  };

  const filteredUsuarios = usuarios.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.codigo.includes(search)
  );

  // Get empleado for a user
  const getEmpleado = (codigo: string) => {
    return empleados.find((e) => e.code === codigo);
  };

  // Get empleado name for a user
  const getEmpleadoName = (codigo: string) => {
    const emp = getEmpleado(codigo);
    return emp ? `${emp.nombres} ${emp.apellidos}` : 'N/A';
  };

  // Get initials for avatar fallback
  const getInitials = (codigo: string) => {
    const emp = getEmpleado(codigo);
    if (!emp) return 'US';
    const n = emp.nombres?.charAt(0) || '';
    const a = emp.apellidos?.charAt(0) || '';
    return (n + a).toUpperCase() || 'US';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/panel/it-manager')}
          className="border-border"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-black tracking-wider text-primary">
          Gestión de Usuarios
        </h1>
      </div>

      <Card className="mx-auto max-w-5xl border-primary/20 bg-card/95">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-primary">Usuarios del Sistema</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-64 border-border bg-input pl-9"
              />
            </div>
            <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-3">Foto</th>
                    <th className="p-3">Codigo</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Empleado</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((usuario) => (
                    <tr
                      key={usuario.codigo}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="p-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/30">
                          <AvatarImage 
                            src={getEmpleado(usuario.codigo)?.foto} 
                            alt={getEmpleadoName(usuario.codigo)} 
                          />
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {getInitials(usuario.codigo)}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-primary/20 px-2 py-1 font-mono text-xs text-primary">
                          {usuario.codigo}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-foreground">{usuario.username}</td>
                      <td className="p-3 text-muted-foreground">{getEmpleadoName(usuario.codigo)}</td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            usuario.rol === 'admin'
                              ? 'bg-red-500/20 text-red-400'
                              : usuario.rol === 'it-manager'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {usuario.rol}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleActive(usuario)}
                          className={`rounded px-2 py-1 text-xs transition-colors ${
                            usuario.activo
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(usuario)}
                            className="h-8 w-8 p-0 text-primary hover:bg-primary/20"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetPIN(usuario)}
                            className="h-8 w-8 p-0 text-yellow-500 hover:bg-yellow-500/20"
                            title="Resetear PIN"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(usuario.codigo)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <UserFormModal
          empleados={empleados}
          existingUser={editingUser}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}
