'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEmpleados, type Empleado } from '@/lib/firebase';

interface MuralMember {
  id: string;
  nombre: string;
  apellidos: string;
  fecha: string; // DD/MM
  foto?: string;
}

export function QABirthdayMural() {
  const [team, setTeam] = useState<MuralMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const muralRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        const empleados = await getEmpleados();
        const filtered = empleados
          .filter(e => e.activo !== false && e.fechaNac)
          .map(emp => {
            const [year, mes, dia] = emp.fechaNac!.split('-');
            return {
              id: emp.code || emp.cedula || `emp-${Math.random()}`,
              nombre: emp.nombres || '',
              apellidos: emp.apellidos || '',
              fecha: `${dia}/${mes}`,
              foto: emp.foto,
            };
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        setTeam(filtered);
      } catch (err) {
        console.error('Error loading empleados:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEmpleados();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, memberId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTeam(team.map(m => m.id === memberId ? { ...m, foto: base64 } : m));
    };
    reader.readAsDataURL(file);
  };

  const handleMemberClick = (memberId: string) => {
    setSelectedMember(memberId);
    fileInputRef.current?.click();
  };

  const handleExport = async () => {
    if (!muralRef.current) return;
    setExporting(true);

    try {
      const { html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(muralRef.current, {
        scale: 2,
        backgroundColor: '#0A1128',
        logging: false,
        allowTaint: true,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Mural_Cumpleañeros_QA_${team.length}_Empleados.png`;
      link.click();
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar. Por favor intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const getInitials = (nombre: string, apellidos: string) => {
    const n = nombre.split(' ')[0]?.[0] || '';
    const a = apellidos.split(' ')[0]?.[0] || '';
    return (n + a).toUpperCase() || 'EM';
  };

  const calculateGrid = () => {
    const count = team.length;
    if (count <= 5) return { cols: count, rows: 1 };
    if (count <= 10) return { cols: 5, rows: 2 };
    if (count <= 15) return { cols: 5, rows: 3 };
    if (count <= 20) return { cols: 5, rows: 4 };
    // Para más empleados, ajustar dinámicamente
    const cols = 5;
    const rows = Math.ceil(count / cols);
    return { cols, rows };
  };

  const grid = calculateGrid();
  const cardSize = `${100 / grid.cols}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-white text-lg">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-8">
      {/* Header Controls */}
      <div className="max-w-full mx-auto mb-8">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-yellow-400">Mural de Cumpleañeros QA</h1>
            <p className="text-yellow-200 text-sm mt-2">Total de empleados: {team.length}</p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => {
                const original = team.map(m => {
                  const emp = TEAM_ORIGINAL.find(e => e.code === m.id);
                  return { ...m, foto: emp?.foto };
                });
                setTeam(original);
              }}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reiniciar Fotos
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || team.length === 0}
              className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? 'Exportando...' : `Exportar ${team.length} Empleados`}
            </Button>
          </div>
        </div>
      </div>

      {/* Mural - Scroll horizontal si es necesario */}
      <div className="max-w-full overflow-x-auto bg-slate-800/50 rounded-lg p-4">
        <div
          ref={muralRef}
          className="relative mx-auto"
          style={{
            aspectRatio: '150/80',
            width: `${Math.max(1500, (grid.cols / 5) * 1500)}px`,
            background: 'linear-gradient(135deg, #0A1128 0%, #1C2541 50%, #0A1128 100%)',
            borderRadius: '8px',
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.1)',
          }}
        >
          {/* Patrón de circuitos sutil */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(0deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              borderRadius: '8px',
            }}
          />

          {/* Globos 3D Izquierda */}
          {grid.cols <= 5 && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              <div
                className="w-12 h-16 rounded-full shadow-2xl"
                style={{
                  background: 'radial-gradient(135deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
                  boxShadow: '0 20px 40px rgba(255, 215, 0, 0.3), inset -2px -2px 5px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="w-0.5 h-10 bg-gray-400 absolute left-1/2 -translate-x-1/2 top-full"></div>
              </div>
              <div
                className="w-10 h-14 rounded-full shadow-2xl"
                style={{
                  background: 'radial-gradient(135deg, #C0C0C0 0%, #A8A9AD 50%, #808080 100%)',
                  boxShadow: '0 20px 40px rgba(192, 192, 192, 0.3), inset -2px -2px 5px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="w-0.5 h-8 bg-gray-400 absolute left-1/2 -translate-x-1/2 top-full"></div>
              </div>
            </div>
          )}

          {/* Globos 3D Derecha */}
          {grid.cols <= 5 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              <div
                className="w-10 h-14 rounded-full shadow-2xl"
                style={{
                  background: 'radial-gradient(135deg, #C0C0C0 0%, #A8A9AD 50%, #808080 100%)',
                  boxShadow: '0 20px 40px rgba(192, 192, 192, 0.3), inset -2px -2px 5px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="w-0.5 h-8 bg-gray-400 absolute left-1/2 -translate-x-1/2 top-full"></div>
              </div>
              <div
                className="w-12 h-16 rounded-full shadow-2xl"
                style={{
                  background: 'radial-gradient(135deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
                  boxShadow: '0 20px 40px rgba(255, 215, 0, 0.3), inset -2px -2px 5px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className="w-0.5 h-10 bg-gray-400 absolute left-1/2 -translate-x-1/2 top-full"></div>
              </div>
            </div>
          )}

          {/* Contenido Principal */}
          <div className="relative z-10 h-full flex flex-col" style={{ padding: grid.cols <= 5 ? '2rem' : '1rem' }}>
            {/* Encabezado */}
            <div className="text-center" style={{ marginBottom: grid.cols <= 5 ? '1.5rem' : '0.75rem' }}>
              <h1
                className="font-bold"
                style={{
                  fontSize: grid.cols <= 5 ? '3rem' : '2rem',
                  color: '#FFD700',
                  textShadow: '0 4px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3)',
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '2px',
                  margin: 0,
                }}
              >
                CUMPLEAÑEROS DEL AÑO QA
              </h1>
              <p
                className="italic"
                style={{
                  fontSize: grid.cols <= 5 ? '1.25rem' : '0.875rem',
                  color: '#E6E6FA',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                  fontFamily: 'Georgia, serif',
                  margin: grid.cols <= 5 ? '0.5rem 0 0 0' : '0.25rem 0 0 0',
                }}
              >
                Desde ya Feliz Cumpleaños les desea el equipo de trabajo.
              </p>
            </div>

            {/* Grid de Tarjetas */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
                gap: grid.cols <= 5 ? '1rem' : '0.5rem',
                padding: grid.cols <= 5 ? '0 1rem' : '0 0.5rem',
              }}
            >
              {team.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center justify-between cursor-pointer group h-full"
                  onClick={() => handleMemberClick(member.id)}
                >
                  {/* Marco Circular */}
                  <div className="relative mb-1">
                    {/* Brillo exterior */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
                        filter: 'blur(8px)',
                      }}
                    />

                    {/* Borde metálico dorado */}
                    <div
                      className="relative rounded-full p-1 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: 'linear-gradient(135deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
                        boxShadow: `
                          0 10px 20px rgba(255, 215, 0, 0.2),
                          inset -2px -2px 4px rgba(0, 0, 0, 0.3),
                          inset 2px 2px 4px rgba(255, 255, 255, 0.2)
                        `,
                        width: grid.cols <= 5 ? '80px' : '60px',
                        height: grid.cols <= 5 ? '80px' : '60px',
                      }}
                    >
                      {/* Avatar */}
                      {member.foto ? (
                        <img
                          src={member.foto}
                          alt={member.nombre}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #1C2541 0%, #2D3E5F 100%)',
                            border: '2px solid rgba(255, 215, 0, 0.3)',
                            fontSize: grid.cols <= 5 ? '18px' : '14px',
                          }}
                        >
                          {getInitials(member.nombre, member.apellidos)}
                        </div>
                      )}
                    </div>

                    {/* Icono upload hover */}
                    <div
                      className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' }}
                    >
                      <Upload className="w-3 h-3 text-black" />
                    </div>
                  </div>

                  {/* Placa de Información */}
                  <div
                    className="w-full px-1 py-0.5 rounded flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <p
                      className="text-center font-bold leading-tight"
                      style={{
                        color: '#0A1128',
                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.3)',
                        fontSize: grid.cols <= 5 ? '9px' : '7px',
                        margin: 0,
                      }}
                    >
                      {member.nombre.substring(0, 18)}
                    </p>
                    <p
                      className="text-center"
                      style={{
                        color: '#1C2541',
                        fontWeight: 'bold',
                        fontSize: grid.cols <= 5 ? '8px' : '6px',
                        margin: 0,
                      }}
                    >
                      {member.fecha}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (selectedMember !== null) {
            handlePhotoUpload(e, selectedMember);
          }
        }}
      />

      {/* Info de empleados */}
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>Mural de {team.length} empleados en grid de {grid.cols}x{grid.rows}</p>
        <p>Haz clic en las fotos para cambiarlas | Exporta en alta calidad para impresión</p>
      </div>
    </div>
  );
}

// Variable temporal para referencia
const TEAM_ORIGINAL: any[] = [];
