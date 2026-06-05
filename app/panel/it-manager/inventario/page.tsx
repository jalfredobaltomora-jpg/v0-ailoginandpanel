'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Tablet, Scan, Search, Plus, Trash2, Camera, ClipboardCheck, ClipboardList, UserCheck, UserX, CheckCircle, XCircle, Edit, Printer, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStoredUser } from '@/lib/auth-store';
import type { EquipoInventario, UsuarioIT } from '@/lib/firebase';
import { tienePermiso } from '@/lib/permisos';

const EquipmentFormModal = dynamic(() => import('@/components/inventario/equipment-form-modal').then(m => m.EquipmentFormModal), { ssr: false });
const QRLabel = dynamic(() => import('@/components/inventario/qr-label').then(m => m.QRLabel), { ssr: false });
const PhotoGallery = dynamic(() => import('@/components/inventario/photo-gallery').then(m => m.PhotoGallery), { ssr: false });
const MonthlyAuditModal = dynamic(() => import('@/components/inventario/monthly-audit-modal').then(m => m.MonthlyAuditModal), { ssr: false });

export default function InventarioPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioIT | null>(null);
  const [equipos, setEquipos] = useState<EquipoInventario[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'agregar' | 'tablet' | 'scanner' | 'inspection'>('agregar');
  const [empleadosMap, setEmpleadosMap] = useState<Record<string, string>>({});
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoInventario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [photoGallery, setPhotoGallery] = useState<{ photos: { url: string; label: string }[]; index: number } | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [viewSignature, setViewSignature] = useState<string | null>(null);

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

  const getEmpleadoNombre = (code: string) => {
    if (!code) return 'Sin asignar';
    return empleadosMap[code] || code;
  };

  const filteredEquipos = equipos.filter((e) => {
    if (activeTab === 'agregar' || activeTab === 'inspection') return false;
    const matchesTipo = e.tipo === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      (e.serialNumber || '').toLowerCase().includes(q) ||
      (e.marca || '').toLowerCase().includes(q) ||
      (e.modelo || '').toLowerCase().includes(q) ||
      (e.estado || '').toLowerCase().includes(q) ||
      (e.empleadoAsignado || '').toLowerCase().includes(q) ||
      (getEmpleadoNombre(e.empleadoAsignado) || '').toLowerCase().includes(q);
    return matchesTipo && matchesSearch;
  });

  const tabletAsignados = equipos.filter(e => e.tipo === 'tablet' && e.empleadoAsignado);
  const tabletSinAsignar = equipos.filter(e => e.tipo === 'tablet' && !e.empleadoAsignado);
  const scannerAsignados = equipos.filter(e => e.tipo === 'scanner' && e.empleadoAsignado);
  const scannerSinAsignar = equipos.filter(e => e.tipo === 'scanner' && !e.empleadoAsignado);

  // All historial entries aggregated for inspection tab
  const allAudits = useMemo(() => {
    const audits: { equipoId: string; serialNumber: string; tipo: string; empleado: string; empleadoNombre: string; estaAsignado: boolean; historial: any }[] = [];
    for (const eq of equipos) {
      if (eq.historial && eq.historial.length > 0) {
        for (const h of eq.historial) {
          audits.push({
            equipoId: eq.id,
            serialNumber: eq.serialNumber,
            tipo: eq.tipo === 'tablet' ? 'Tablet' : 'Scanner',
            empleado: eq.empleadoAsignado || 'Sin asignar',
            empleadoNombre: getEmpleadoNombre(eq.empleadoAsignado),
            estaAsignado: !!eq.empleadoAsignado,
            historial: h,
          });
        }
      }
    }
    audits.sort((a, b) => (b.historial.timestamp || 0) - (a.historial.timestamp || 0));
    return audits;
  }, [equipos, empleadosMap]);

  const auditsGrouped = useMemo(() => {
    const groups: { label: string; tipos: { label: string; audits: typeof allAudits }[] }[] = [
      { label: 'Equipo Asignado', tipos: [{ label: 'Tablet', audits: [] }, { label: 'Scanner', audits: [] }] },
      { label: 'Equipo No asignado', tipos: [{ label: 'Tablet', audits: [] }, { label: 'Scanner', audits: [] }] },
    ];
    for (const a of allAudits) {
      const grupo = a.estaAsignado ? groups[0] : groups[1];
      const tipo = grupo.tipos.find(t => t.label === a.tipo);
      if (tipo) tipo.audits.push(a);
    }
    return groups;
  }, [allAudits]);

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

  const handleGenerateReport = async () => {
    const XLSX = await import('xlsx');
    const data = allAudits.map(a => ({
      Serie: a.serialNumber,
      Tipo: a.tipo,
      Empleado: a.empleadoNombre,
      'Eq. Asignado': a.estaAsignado ? 'Si' : 'No',
      Mes: a.historial.mes || '-',
      Score_JAB: a.historial.scoreJAB >= 0 ? a.historial.scoreJAB + '%' : '-',
      Comentarios: a.historial.comentarios || '-',
      'Firma Asignado': a.historial.firmaAsignado ? 'Si' : 'No',
      'Firma Auditor': a.historial.firmaAuditor ? 'Si' : 'No',
      Fecha: a.historial.timestamp ? new Date(a.historial.timestamp).toLocaleDateString('es-MX') : '-',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    // Professional PowerBI-style header styling
    const headerKeys = Object.keys(data[0] || {});
    const headerR = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[headerR]) {
      ws[headerR].s = {
        fill: { fgColor: { rgb: '005A8C' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11, name: 'Segoe UI' },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'FFFFFF' } },
          bottom: { style: 'medium', color: { rgb: '003D66' } },
          left: { style: 'thin', color: { rgb: 'FFFFFF' } },
          right: { style: 'thin', color: { rgb: 'FFFFFF' } },
        },
      };
    }
    // Style all header cells
    for (let c = 0; c < headerKeys.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) {
        ws[addr].s = {
          fill: { fgColor: { rgb: '005A8C' } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11, name: 'Segoe UI' },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'FFFFFF' } },
            bottom: { style: 'medium', color: { rgb: '003D66' } },
            left: { style: 'thin', color: { rgb: 'FFFFFF' } },
            right: { style: 'thin', color: { rgb: 'FFFFFF' } },
          },
        };
      }
    }
    // Style data rows with alternating colors
    for (let r = 1; r <= data.length; r++) {
      const rowBg = r % 2 === 0 ? 'F2F7FB' : 'FFFFFF';
      for (let c = 0; c < headerKeys.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr]) {
          ws[addr].s = {
            fill: { fgColor: { rgb: rowBg } },
            font: { name: 'Segoe UI', size: 10, color: { rgb: '333333' } },
            alignment: { vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'DEE2E6' } },
              bottom: { style: 'thin', color: { rgb: 'DEE2E6' } },
              left: { style: 'thin', color: { rgb: 'DEE2E6' } },
              right: { style: 'thin', color: { rgb: 'DEE2E6' } },
            },
          };
        }
      }
    }
    // Special formatting for Score column (index 5)
    const scoreIdx = headerKeys.findIndex(k => k === 'Score_JAB');
    if (scoreIdx >= 0) {
      for (let r = 1; r <= data.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: scoreIdx });
        if (ws[addr]) {
          const val = data[r - 1].Score_JAB;
          const numVal = parseInt(val);
          if (!isNaN(numVal)) {
            ws[addr].s = {
              ...ws[addr].s,
              font: {
                ...ws[addr].s.font,
                bold: true,
                color: { rgb: numVal >= 80 ? '16A34A' : numVal >= 60 ? 'CA8A04' : 'DC2626' },
              },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
          }
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Auditorias');
    const colWidths = headerKeys.map(k => ({
      wch: Math.max(k.length, ...data.map(r => String((r as any)[k] || '').length)) + 3,
    }));
    ws['!cols'] = colWidths;
    // Freeze top row
    ws['!freeze'] = { x: 0, y: 1 };
    XLSX.writeFile(wb, `auditorias-inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintReport = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const now = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    let html = `<!DOCTYPE html><html><head><title>Reporte de Auditorias</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; padding: 30px; background: #f8fafc; }
        .report-container { max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .report-header { background: linear-gradient(135deg, #005A8C 0%, #0077B6 100%); padding: 28px 32px; color: #fff; }
        .report-header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .report-header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; font-weight: 300; }
        .report-body { padding: 24px 32px; }
        .summary-row { display: flex; gap: 16px; margin-bottom: 24px; }
        .summary-card { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 14px 18px; text-align: center; }
        .summary-card .num { font-size: 24px; font-weight: 700; color: #005A8C; }
        .summary-card .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #005A8C; color: #fff; font-weight: 600; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: none; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
        tr:nth-child(even) td { background: #f8fafc; }
        tr:hover td { background: #eef2f7; }
        .score-high { color: #16a34a; font-weight: 700; }
        .score-mid { color: #ca8a04; font-weight: 700; }
        .score-low { color: #dc2626; font-weight: 700; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .section-title { font-size: 14px; font-weight: 700; color: #005A8C; margin: 16px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #005A8C; }
        .group-title { font-size: 12px; font-weight: 600; color: #334155; margin: 14px 0 6px; padding: 4px 8px; background: #eef2f7; border-radius: 4px; display: inline-block; }
        .signature-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
        .sig-yes { background: #dcfce7; color: #16a34a; }
        .sig-no { background: #fef2f2; color: #dc2626; }
        @media print {
          body { background: #fff; padding: 0; }
          .report-container { box-shadow: none; border-radius: 0; }
          .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head><body>
      <div class="report-container">
        <div class="report-header">
          <h1>REPORTE DE AUDITORIAS DE INVENTARIO</h1>
          <p>Generado: ${now} &mdash; Total de auditorias: ${allAudits.length}</p>
        </div>
        <div class="report-body">
          <div class="summary-row">
            <div class="summary-card"><div class="num">${auditsGrouped[0].tipos.reduce((s, t) => s + t.audits.length, 0)}</div><div class="lbl">Equipos Asignados</div></div>
            <div class="summary-card"><div class="num">${auditsGrouped[1].tipos.reduce((s, t) => s + t.audits.length, 0)}</div><div class="lbl">Equipos No asignados</div></div>
            <div class="summary-card"><div class="num">${allAudits.filter(a => a.historial.scoreJAB >= 80).length}</div><div class="lbl">Aprobados (&ge;80%)</div></div>
            <div class="summary-card"><div class="num">${allAudits.filter(a => a.historial.scoreJAB >= 0 && a.historial.scoreJAB < 80).length}</div><div class="lbl">Pendientes (&lt;80%)</div></div>
          </div>`;
    for (const grupo of auditsGrouped) {
      const totalGrupo = grupo.tipos.reduce((s, t) => s + t.audits.length, 0);
      if (totalGrupo === 0) continue;
      html += `<div class="section-title">${grupo.label}</div>`;
      for (const tipo of grupo.tipos) {
        if (tipo.audits.length === 0) continue;
        html += `<div class="group-title">${tipo.label} (${tipo.audits.length})</div>`;
        html += `<table><thead><tr>
          <th>Serie</th><th>Empleado</th><th>Mes</th><th>Score JAB</th><th>Comentarios</th><th>F. Asignado</th><th>F. Auditor</th><th>Fecha</th>
        </tr></thead><tbody>`;
        for (const a of tipo.audits) {
          const score = a.historial.scoreJAB;
          const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low';
          html += `<tr>
            <td style="font-family: monospace; font-size: 10px;">${a.serialNumber}</td>
            <td>${a.empleadoNombre}</td>
            <td>${a.historial.mes || '-'}</td>
            <td class="${scoreClass}">${score >= 0 ? score + '%' : '-'}</td>
            <td style="max-width: 200px;">${a.historial.comentarios || '-'}</td>
            <td><span class="signature-badge ${a.historial.firmaAsignado ? 'sig-yes' : 'sig-no'}">${a.historial.firmaAsignado ? 'Si' : 'No'}</span></td>
            <td><span class="signature-badge ${a.historial.firmaAuditor ? 'sig-yes' : 'sig-no'}">${a.historial.firmaAuditor ? 'Si' : 'No'}</span></td>
            <td>${a.historial.timestamp ? new Date(a.historial.timestamp).toLocaleDateString('es-MX') : '-'}</td>
          </tr>`;
        }
        html += `</tbody></table>`;
      }
    }
    html += `
        <div class="footer">Reporte generado automaticamente el ${new Date().toLocaleString('es-MX')}</div>
      </div></div>
    </body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex items-center justify-between border-b border-border bg-card/50 p-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/panel/it-manager')} className="border-border">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
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
              {activeTab === 'agregar' ? 'Agregar Equipo' :
               activeTab === 'tablet' ? 'Inventario Tablet' :
               activeTab === 'scanner' ? 'Inventario de Escaner' :
               'Inspeccion Mensual'}
            </CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
              {activeTab !== 'agregar' && activeTab !== 'inspection' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-64 border-border bg-input pl-9" />
                </div>
              )}
              {activeTab === 'inspection' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-border" onClick={handlePrintReport}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </Button>
                  <Button variant="outline" size="sm" className="border-border" onClick={handleGenerateReport}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Generar Reporte
                  </Button>
                  <Button onClick={() => setAuditModalOpen(true)} className="bg-primary text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Auditoria de inventario
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 pt-0">
              <div className="flex border-b border-border">
                {([
                  { key: 'agregar', label: 'Agregar equipo', icon: Plus },
                  { key: 'tablet', label: 'Inventario Tablet', icon: Tablet },
                  { key: 'scanner', label: 'Inventario de Escaner', icon: Scan },
                  { key: 'inspection', label: 'Inspeccion Mensual', icon: ClipboardList },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === key
                        ? 'rounded-t-lg border border-border border-b-0 bg-card text-foreground -mb-px z-10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {(key === 'tablet' || key === 'scanner') && (
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        activeTab === key
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted-foreground/10 text-muted-foreground'
                      }`}>
                        {key === 'tablet' ? equipos.filter(e => e.tipo === 'tablet').length : equipos.filter(e => e.tipo === 'scanner').length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border p-6">
              {activeTab === 'agregar' && (
                <div className="flex flex-col items-center justify-center py-12 gap-6">
                  <p className="text-muted-foreground text-center max-w-md">
                    Aqui puedes agregar nuevas Tablets o Escaners al inventario.
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={() => { setActiveTab('tablet'); handleCreateNew(); }} variant="outline" className="border-border gap-2">
                      <Tablet className="h-5 w-5" /> Agregar Tablet
                    </Button>
                    <Button onClick={() => { setActiveTab('scanner'); handleCreateNew(); }} variant="outline" className="border-border gap-2">
                      <Scan className="h-5 w-5" /> Agregar Escaner
                    </Button>
                  </div>
                </div>
              )}

              {(activeTab === 'tablet' || activeTab === 'scanner') && (
                <>
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground">Cargando...</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Asignados */}
                      <div>
                        <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          Asignados
                          <span className="ml-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                            {(activeTab === 'tablet' ? tabletAsignados : scannerAsignados).length}
                          </span>
                        </h3>
                        {renderEquipmentList(
                          activeTab === 'tablet' ? tabletAsignados : scannerAsignados,
                          search,
                        )}
                      </div>
                      {/* Sin asignar */}
                      <div>
                        <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                          <UserX className="h-4 w-4 text-muted-foreground" />
                          Sin asignar
                          <span className="ml-1 rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs text-muted-foreground">
                            {(activeTab === 'tablet' ? tabletSinAsignar : scannerSinAsignar).length}
                          </span>
                        </h3>
                        {renderEquipmentList(
                          activeTab === 'tablet' ? tabletSinAsignar : scannerSinAsignar,
                          search,
                        )}
                      </div>
                    </div>
                  )}
                  
                </>
              )}

              {activeTab === 'inspection' && (
                <div className="space-y-8">
                  {allAudits.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      No hay auditorias registradas. Presiona "Agregar Auditoria de inventario" para comenzar.
                    </div>
                  ) : (
                    auditsGrouped.map(grupo => (
                      <div key={grupo.label}>
                        <h3 className="flex items-center gap-2 mb-4 text-base font-semibold text-foreground border-b border-border pb-2">
                          {grupo.label === 'Equipo Asignado' ? <UserCheck className="h-5 w-5 text-green-500" /> : <UserX className="h-5 w-5 text-muted-foreground" />}
                          {grupo.label}
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {grupo.tipos.map(tipo => tipo.audits.length > 0 && (
                            <div key={tipo.label} className="rounded-lg border border-border bg-muted/10 overflow-hidden">
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/20">
                                {tipo.label}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-primary/5 border-b border-border">
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Serie</th>
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Empleado</th>
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Mes</th>
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Score</th>
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Comentarios</th>
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Fecha</th>
                                      <th className="p-2 text-left font-medium text-primary text-[11px]">Firmas</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tipo.audits.map((a, i) => (
                                      <tr key={`${a.equipoId}-${i}`} className="border-b border-border hover:bg-muted/20">
                                        <td className="p-2 font-mono text-[11px] text-primary whitespace-nowrap">{a.serialNumber}</td>
                                        <td className="p-2 text-xs font-medium whitespace-nowrap">{a.empleadoNombre}</td>
                                        <td className="p-2 text-[11px] whitespace-nowrap">{a.historial.mes || '-'}</td>
                                        <td className="p-2">
                                          {a.historial.scoreJAB >= 0 ? (
                                            <span className={`font-bold text-xs ${
                                              a.historial.scoreJAB >= 80 ? 'text-green-500' :
                                              a.historial.scoreJAB >= 60 ? 'text-yellow-500' : 'text-red-500'
                                            }`}>{a.historial.scoreJAB}%</span>
                                          ) : (<span className="text-muted-foreground text-[11px]">-</span>)}
                                        </td>
                                        <td className="p-2 text-[11px] text-muted-foreground max-w-40 truncate">{a.historial.comentarios || '-'}</td>
                                        <td className="p-2 text-[11px] whitespace-nowrap">{a.historial.timestamp ? new Date(a.historial.timestamp).toLocaleDateString('es-MX') : '-'}</td>
                                        <td className="p-2">
                                          <div className="flex gap-1">
                                            {a.historial.firmaAsignado ? (
                                              <button onClick={() => setViewSignature(a.historial.firmaAsignado)}
                                                className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                                title="Ver firma del asignado">
                                                Asig.
                                              </button>
                                            ) : <span className="text-[10px] text-muted-foreground">-</span>}
                                            {a.historial.firmaAuditor ? (
                                              <button onClick={() => setViewSignature(a.historial.firmaAuditor)}
                                                className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400 hover:bg-purple-500/20 border border-purple-500/20"
                                                title="Ver firma del auditor">
                                                Audit.
                                              </button>
                                            ) : null}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <EquipmentFormModal equipo={selectedEquipo} onClose={handleCloseModal} onSaved={handleSaved} />
      )}

      {auditModalOpen && (
        <MonthlyAuditModal
          equipos={equipos}
          empleadosMap={empleadosMap}
          onClose={() => setAuditModalOpen(false)}
          onSaved={() => {}}
        />
      )}

      {photoGallery && (
        <PhotoGallery photos={photoGallery.photos} initialIndex={photoGallery.index} onClose={() => setPhotoGallery(null)} />
      )}

      {viewSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setViewSignature(null)}>
          <div className="max-w-md w-full rounded-lg bg-white p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={viewSignature} alt="Firma" className="w-full h-auto rounded border border-gray-200" />
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewSignature(null)} className="border-border">Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  function renderEquipmentList(list: EquipoInventario[], query: string) {
    const q = query.toLowerCase();
    const filtered = list.filter(eq =>
      (eq.serialNumber || '').toLowerCase().includes(q) ||
      (eq.marca || '').toLowerCase().includes(q) ||
      (eq.modelo || '').toLowerCase().includes(q) ||
      (eq.empleadoAsignado || '').toLowerCase().includes(q) ||
      (getEmpleadoNombre(eq.empleadoAsignado) || '').toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      return <div className="py-4 text-center text-muted-foreground text-sm">No hay equipos en esta categoria</div>;
    }

    return (
      <div className="space-y-3">
        {filtered.map((eq) => (
          <div key={eq.id} className="rounded-lg border border-border bg-muted/20 p-4 hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => handleEdit(eq)}>
            <div className="mb-3 flex gap-2">
              {fotoAngleLabels.map(({ key, label }) => (
                <div key={key} className="relative flex h-20 flex-1 items-center justify-center rounded-md border border-border/50 bg-muted/10 overflow-hidden">
                  {eq.fotos?.[key] ? (
                    <img src={eq.fotos[key]} alt={label} className="h-full w-full object-cover"
                      onClick={(e) => { e.stopPropagation(); const ordered = fotoAngleLabels.filter(f => eq.fotos[f.key]).map(f => ({ url: eq.fotos[f.key], label: f.label })); setPhotoGallery({ photos: ordered, index: Math.max(0, ordered.findIndex(p => p.url === eq.fotos[key])) }); }}
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
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-xs text-primary">{eq.serialNumber}</span>
                  {eq.marca && <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">{eq.marca}</span>}
                  {eq.modelo && <span className="rounded bg-muted-foreground/10 px-2 py-0.5 text-xs text-muted-foreground">{eq.modelo}</span>}
                  <span className="font-medium text-foreground truncate">{getEmpleadoNombre(eq.empleadoAsignado)}</span>
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
                    <span key={k} className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-500">{accesorioLabels[k]}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <QRLabel equipo={eq} empleadoNombre={getEmpleadoNombre(eq.empleadoAsignado)} size={100} />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                onClick={(e) => { e.stopPropagation(); handleDelete(eq); }} title="Eliminar equipo">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }
}
