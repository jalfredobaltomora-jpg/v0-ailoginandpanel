'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanLine, CalendarDays, CalendarRange, BarChart3, Database, LineChart, ClipboardList, BookOpen, Trash2, Pencil, Bug, Upload, Search, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStoredUser } from '@/lib/auth-store';
import { tienePermisoEnGrupo, puedeVer } from '@/lib/permisos';
import type { UsuarioIT } from '@/lib/firebase';

const CodeExtractor = dynamic(() => import('@/components/qa-reports/code-extractor').then(m => m.CodeExtractor), { ssr: false });
const WeeklyIssues = dynamic(() => import('@/components/qa-reports/weekly-issues').then(m => m.WeeklyIssues), { ssr: false });
const MonthlyIssues = dynamic(() => import('@/components/qa-reports/monthly-issues').then(m => m.MonthlyIssues), { ssr: false });
const KpiReports = dynamic(() => import('@/components/qa-reports/kpi-reports').then(m => m.KpiReports), { ssr: false });
const WeeklyRegistry = dynamic(() => import('@/components/qa-reports/weekly-registry').then(m => m.WeeklyRegistry), { ssr: false });
const QADHUModal = dynamic(() => import('@/components/inventario/qa-dhu-modal').then(m => m.QADHUModal), { ssr: false });
const InLineDefectModal = dynamic(() => import('@/components/inventario/in-line-defect-modal').then(m => m.InLineDefectModal), { ssr: false });
const AnalyticsModal = dynamic(() => import('@/components/inventario/analytics-modal').then(m => m.AnalyticsModal), { ssr: false });

interface TileProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function Tile({ title, subtitle, icon, color, onClick }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative min-h-36 min-w-36 overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg ${color}`}
    >
      <div className="relative z-10">
        <div className="mb-2 text-3xl text-white/90">{icon}</div>
        <div className="font-bold text-white">{title}</div>
        <div className="text-xs text-white/70">{subtitle}</div>
      </div>
    </button>
  );
}

export default function QAReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioIT | null>(null);
  const [view, setView] = useState<'tiles' | 'extractor' | 'weekly' | 'monthly' | 'kpi' | 'registry' | 'dhu'>('tiles');
  const [dhuTab, setDhuTab] = useState<'inline' | 'defect' | 'catalog'>('inline');
  const [qaDhuOpen, setQaDhuOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [qaDhuRecords, setQaDhuRecords] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [inLineDefectOpen, setInLineDefectOpen] = useState(false);
  const [editingDefectRecord, setEditingDefectRecord] = useState<any>(null);
  const [inLineDefectRecords, setInLineDefectRecords] = useState<any[]>([]);
  const [defectCatalogItems, setDefectCatalogItems] = useState<any[]>([]);
  const [newDefectCat, setNewDefectCat] = useState({ defectCode: '', defectDescription: '', catEnglish: '', acr: '', defectCatEnglish: '', descripcionDefecto: '', catEspanol: '', acrSpanish: '', defectCatSpanish: '' });
  const [savingDefectCat, setSavingDefectCat] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [defectCatalogSearch, setDefectCatalogSearch] = useState('');
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const isAdmin = currentUser?.rol === 'admin' || currentUser?.rol === 'it-manager';
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view !== 'dhu') return;
    let unsub1: () => void;
    let unsub2: () => void;
    let unsub3: () => void;
    let unsub4: () => void;
    import('@/lib/firebase').then(({ listenToQADHURecords, listenToQADHUCatalog, listenToInLineDefectRecords, listenToQADHUDefectCatalog, getEmpleadosActivos }) => {
      unsub1 = listenToQADHURecords((data: any) => setQaDhuRecords(data));
      unsub2 = listenToQADHUCatalog((data: any) => setCatalogItems(data));
      unsub3 = listenToInLineDefectRecords((data: any) => setInLineDefectRecords(data));
      unsub4 = listenToQADHUDefectCatalog((data: any) => setDefectCatalogItems(data));
      getEmpleadosActivos().then(setEmpleados);
    });
    return () => { if (unsub1) unsub1(); if (unsub2) unsub2(); if (unsub3) unsub3(); if (unsub4) unsub4(); };
  }, [view]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push('/');
      return;
    }
    if (!tienePermisoEnGrupo(user, 'qa_')) {
      router.push('/panel');
    }
    setCurrentUser(user);
  }, [router]);

  const handleEdit = (r: any) => {
    setEditingRecord(r);
    setQaDhuOpen(true);
  };

  const handleSaveDefectCatalog = async () => {
    if (!newDefectCat.defectCode) return;
    setSavingDefectCat(true);
    const { saveQADHUDefectCatalogItem } = await import('@/lib/firebase');
    const user = getStoredUser();
    await saveQADHUDefectCatalogItem({
      ...newDefectCat,
      createdAt: Date.now(),
      createdBy: user?.codigo || '',
    });
    setNewDefectCat({ defectCode: '', defectDescription: '', catEnglish: '', acr: '', defectCatEnglish: '', descripcionDefecto: '', catEspanol: '', acrSpanish: '', defectCatSpanish: '' });
    setSavingDefectCat(false);
  };

  const handleDeleteDefectCatalog = async (id: string) => {
    const { deleteQADHUDefectCatalogItem } = await import('@/lib/firebase');
    await deleteQADHUDefectCatalogItem(id);
  };

  const handleEditDefect = (r: any) => {
    setEditingDefectRecord(r);
    setInLineDefectOpen(true);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    setImportProgress('Leyendo archivo...');
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellText: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      const user = getStoredUser();
      const { saveQADHUDefectCatalogItem } = await import('@/lib/firebase');
      let imported = 0;
      let skipped = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) { skipped++; continue; }
        const defectCode = (row[0] || '').toString().trim();
        if (!defectCode) { skipped++; continue; }
        setImportProgress(`Importando ${i}/${rows.length - 1}: ${defectCode}`);
        await saveQADHUDefectCatalogItem({
          defectCode,
          defectDescription: (row[1] || '').toString().trim(),
          catEnglish: (row[2] || '').toString().trim(),
          acr: (row[3] || '').toString().trim(),
          defectCatEnglish: (row[4] || '').toString().trim(),
          descripcionDefecto: (row[5] || '').toString().trim(),
          catEspanol: (row[6] || '').toString().trim(),
          acrSpanish: (row[7] || '').toString().trim(),
          defectCatSpanish: (row[8] || '').toString().trim(),
          createdAt: Date.now(),
          createdBy: user?.codigo || '',
        });
        imported++;
      }
      setImportProgress(`✅ Importación completada: ${imported} registros agregados${skipped > 0 ? `, ${skipped} omitidos` : ''}`);
    } catch (err) {
      setImportProgress(`❌ Error al importar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
    setImportingExcel(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setImportProgress(''), 5000);
  };

  const handleDeleteInLineDefect = async (id: string) => {
    const { deleteInLineDefectRecord } = await import('@/lib/firebase');
    if (deleteInLineDefectRecord) await deleteInLineDefectRecord(id);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex items-center justify-between border-b border-border bg-card/50 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => view === 'tiles' ? router.push('/panel') : setView('tiles')}
            className="border-border"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {view === 'tiles' ? 'Regresar' : 'Volver'}
          </Button>
          <h2 className="text-xl font-bold">
            <span className="text-primary">QA Reports</span>{' '}
            <span className="text-foreground">(Panel)</span>
          </h2>
        </div>
      </div>

      <div className="p-8">
        {view === 'tiles' && (
          <div className="flex flex-wrap justify-center gap-6">
            {puedeVer(currentUser, 'qa_extractor') && (
              <Tile title="Extractor" subtitle="Codigo de Caja" icon={<ScanLine className="h-8 w-8" />}
                color="bg-gradient-to-br from-cyan-500 to-cyan-700" onClick={() => setView('extractor')} />
            )}
            {puedeVer(currentUser, 'qa_weekly') && (
              <Tile title="Weekly Issues" subtitle="Issues Semanales" icon={<CalendarDays className="h-8 w-8" />}
                color="bg-gradient-to-br from-amber-500 to-amber-700" onClick={() => setView('weekly')} />
            )}
            {puedeVer(currentUser, 'qa_monthly') && (
              <Tile title="Monthly Issues" subtitle="Issues Mensuales" icon={<CalendarRange className="h-8 w-8" />}
                color="bg-gradient-to-br from-blue-500 to-blue-700" onClick={() => setView('monthly')} />
            )}
            {puedeVer(currentUser, 'qa_registry') && (
              <Tile title="Registro Weekly" subtitle="Historial Semanal" icon={<Database className="h-8 w-8" />}
                color="bg-gradient-to-br from-purple-500 to-purple-700" onClick={() => setView('registry')} />
            )}
            {puedeVer(currentUser, 'qa_kpi') && (
              <Tile title="KPI Reports" subtitle="Reportes KPI" icon={<BarChart3 className="h-8 w-8" />}
                color="bg-gradient-to-br from-green-500 to-green-700" onClick={() => setView('kpi')} />
            )}
            {puedeVer(currentUser, 'qa_dhu') && (
              <Tile title="QA - DHU % SAE" subtitle="Indicator IN LINE" icon={<LineChart className="h-8 w-8" />}
                color="bg-gradient-to-br from-rose-500 to-rose-700" onClick={() => setView('dhu')} />
            )}
          </div>
        )}

        {view === 'extractor' && <CodeExtractor />}
        {view === 'weekly' && <WeeklyIssues />}
        {view === 'monthly' && <MonthlyIssues />}
        {view === 'registry' && <WeeklyRegistry />}
        {view === 'kpi' && <KpiReports />}

        {view === 'dhu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {dhuTab === 'inline' ? 'QA - DHU % SAE - Indicator IN LINE' : dhuTab === 'defect' ? 'In Line Defect' : 'Catálogo de defectos'}
              </h3>
              <div className="flex gap-2">
                {(dhuTab === 'inline' || dhuTab === 'defect') && (
                  <Button size="sm" variant="outline" onClick={() => setAnalyticsOpen(true)}
                    className="border-primary/50 text-primary hover:bg-primary/10">
                    <Activity className="mr-2 h-4 w-4" /> Analytics
                  </Button>
                )}
                {dhuTab === 'inline' && (
                  <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => { setEditingRecord(null); setQaDhuOpen(true); }}>
                    + Nuevo Registro
                  </Button>
                )}
                {dhuTab === 'defect' && (
                  <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => { setEditingDefectRecord(null); setInLineDefectOpen(true); }}>
                    + Nuevo Defecto
                  </Button>
                )}
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-4 border-b border-border">
              <button onClick={() => setDhuTab('inline')}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${dhuTab === 'inline' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <ClipboardList className="h-4 w-4" /> IN LINE
              </button>
              <button onClick={() => setDhuTab('defect')}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${dhuTab === 'defect' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <Bug className="h-4 w-4" /> In Line Defect
              </button>
              <button onClick={() => setDhuTab('catalog')}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${dhuTab === 'catalog' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <BookOpen className="h-4 w-4" /> Catálogo de defectos
              </button>
            </div>

            {/* IN LINE Tab */}
            {dhuTab === 'inline' && (
              <>
                {qaDhuRecords.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground border rounded-lg border-border">
                    No hay registros QA DHU.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/10 border-b border-border">
                          <th className="p-2 text-left font-medium text-primary">ITEM</th>
                          <th className="p-2 text-left font-medium text-primary">Date</th>
                          <th className="p-2 text-left font-medium text-primary">Week</th>
                          <th className="p-2 text-left font-medium text-primary">Month</th>
                          <th className="p-2 text-left font-medium text-primary">Factory</th>
                          <th className="p-2 text-left font-medium text-primary">Line</th>
                          <th className="p-2 text-left font-medium text-primary">PO</th>
                          <th className="p-2 text-left font-medium text-primary">Color</th>
                          <th className="p-2 text-left font-medium text-primary">Buyer</th>
                          <th className="p-2 text-left font-medium text-primary">Auditor</th>
                          <th className="p-2 text-left font-medium text-primary">Style</th>
                          <th className="p-2 text-left font-medium text-primary">Sample</th>
                          <th className="p-2 text-left font-medium text-primary">Reject</th>
                          <th className="p-2 text-left font-medium text-primary">Approved</th>
                          <th className="p-2 text-left font-medium text-primary">DHU %</th>
                          <th className="p-2 text-left font-medium text-primary">Performance</th>
                           <th className="p-2 text-left font-medium text-primary">Pass Rate %</th>
                           {isAdmin && <th className="p-2 text-left font-medium text-primary">Creado por</th>}
                           <th className="p-2 text-center font-medium text-primary">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qaDhuRecords.map(r => (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                            <td className="p-2 font-medium">{r.item}</td>
                            <td className="p-2 text-xs">{r.inspectionDate}</td>
                            <td className="p-2 text-xs">#{r.week}</td>
                            <td className="p-2 text-xs">{r.month || '-'}</td>
                            <td className="p-2 text-xs">{r.factory}</td>
                            <td className="p-2 text-xs">{r.line || '-'}</td>
                            <td className="p-2 text-xs">{r.po || '-'}</td>
                            <td className="p-2 text-xs">{r.color || '-'}</td>
                            <td className="p-2 text-xs">{r.buyer}</td>
                            <td className="p-2 text-xs">{(empleados.find(e => e.code === r.auditor) ? `${empleados.find(e => e.code === r.auditor)!.nombres} ${empleados.find(e => e.code === r.auditor)!.apellidos}` : r.auditor)}</td>
                            <td className="p-2 text-xs">{r.style || '-'}</td>
                            <td className="p-2 text-xs">{r.visualSample}</td>
                            <td className="p-2 text-xs">{r.visualReject}</td>
                            <td className="p-2 text-xs">{r.visualApproved}</td>
                            <td className="p-2 text-xs">{(r.dhuScorePercent * 100).toFixed(2)}%</td>
                            <td className="p-2">
                              <span className={`text-xs font-bold ${r.performanceDHU === 'Excellent' ? 'text-green-500' : r.performanceDHU === 'Good' ? 'text-yellow-500' : 'text-red-500'}`}>{r.performanceDHU}</span>
                            </td>
                            <td className="p-2 text-xs">{(r.passRateScorePercent * 100).toFixed(2)}%</td>
                            {isAdmin && <td className="p-2 text-xs">{r.createdBy || '-'}</td>}
                            <td className="p-2 text-center">
                              <button onClick={() => handleEdit(r)} className="text-primary hover:text-primary/70" title="Editar">
                                <Pencil className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* In Line Defect Tab */}
            {dhuTab === 'defect' && (
              <>
                {inLineDefectRecords.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground border rounded-lg border-border">
                    No hay registros de In Line Defect.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/10 border-b border-border">
                          <th className="p-2 text-left font-medium text-primary">ITEM</th>
                          <th className="p-2 text-left font-medium text-primary">Date</th>
                          <th className="p-2 text-left font-medium text-primary">Week</th>
                          <th className="p-2 text-left font-medium text-primary">Month</th>
                          <th className="p-2 text-left font-medium text-primary">Factory</th>
                          <th className="p-2 text-left font-medium text-primary">Line</th>
                          <th className="p-2 text-left font-medium text-primary">PO</th>
                          <th className="p-2 text-left font-medium text-primary">Color</th>
                          <th className="p-2 text-left font-medium text-primary">Buyer</th>
                          <th className="p-2 text-left font-medium text-primary">Auditor</th>
                          <th className="p-2 text-left font-medium text-primary">Style</th>
                          <th className="p-2 text-left font-medium text-primary">Defecto</th>
                          <th className="p-2 text-left font-medium text-primary">Total</th>
                          <th className="p-2 text-left font-medium text-primary">Código Defecto</th>
                          <th className="p-2 text-left font-medium text-primary">Descripción</th>
                          <th className="p-2 text-left font-medium text-primary">CAT EN</th>
                          <th className="p-2 text-left font-medium text-primary">ACR</th>
                          <th className="p-2 text-left font-medium text-primary">Defect CAT EN</th>
                          <th className="p-2 text-left font-medium text-primary">Descripción Defecto</th>
                          <th className="p-2 text-left font-medium text-primary">CAT ES</th>
                          <th className="p-2 text-left font-medium text-primary">ACR S</th>
                          <th className="p-2 text-left font-medium text-primary">Defect CAT ES</th>
                          <th className="p-2 text-center font-medium text-primary">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inLineDefectRecords.map(r => (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                            <td className="p-2 font-medium">{r.item}</td>
                            <td className="p-2 text-xs">{r.inspectionDate}</td>
                            <td className="p-2 text-xs">#{r.week}</td>
                            <td className="p-2 text-xs">{r.month || '-'}</td>
                            <td className="p-2 text-xs">{r.factory}</td>
                            <td className="p-2 text-xs">{r.line || '-'}</td>
                            <td className="p-2 text-xs">{r.po || '-'}</td>
                            <td className="p-2 text-xs">{r.color || '-'}</td>
                            <td className="p-2 text-xs">{r.buyer}</td>
                            <td className="p-2 text-xs">{(empleados.find(e => e.code === r.auditor) ? `${empleados.find(e => e.code === r.auditor)!.nombres} ${empleados.find(e => e.code === r.auditor)!.apellidos}` : r.auditor)}</td>
                            <td className="p-2 text-xs">{r.style || '-'}</td>
                            <td className="p-2 text-xs">{r.defect || '-'}</td>
                            <td className="p-2 text-xs">{r.total}</td>
                            <td className="p-2 text-xs">{r.defectCode}</td>
                            <td className="p-2 text-xs">{r.defectDescription || '-'}</td>
                            <td className="p-2 text-xs">{r.catEnglish || '-'}</td>
                            <td className="p-2 text-xs">{r.acr || '-'}</td>
                            <td className="p-2 text-xs">{r.defectCatEnglish || '-'}</td>
                            <td className="p-2 text-xs">{r.descripcionDefecto || '-'}</td>
                            <td className="p-2 text-xs">{r.catEspanol || '-'}</td>
                            <td className="p-2 text-xs">{r.acrSpanish || '-'}</td>
                            <td className="p-2 text-xs">{r.defectCatSpanish || '-'}</td>
                            <td className="p-2 text-center">
                              <button onClick={() => handleEditDefect(r)} className="text-primary hover:text-primary/70 mr-2" title="Editar">
                                <Pencil className="h-4 w-4 inline" />
                              </button>
                              <button onClick={() => handleDeleteInLineDefect(r.id)} className="text-destructive hover:text-destructive/70" title="Eliminar">
                                <Trash2 className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Catálogo de defectos Tab */}
            {dhuTab === 'catalog' && (
              <div className="space-y-6">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="mb-3 text-sm font-semibold text-foreground">Catálogo de Defectos</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Código de Defecto *" value={newDefectCat.defectCode} onChange={e => setNewDefectCat(p => ({ ...p, defectCode: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Descripción de Defecto" value={newDefectCat.defectDescription} onChange={e => setNewDefectCat(p => ({ ...p, defectDescription: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="CAT ENGLISH" value={newDefectCat.catEnglish} onChange={e => setNewDefectCat(p => ({ ...p, catEnglish: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="ACR" value={newDefectCat.acr} onChange={e => setNewDefectCat(p => ({ ...p, acr: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Defecto CAT Inglés" value={newDefectCat.defectCatEnglish} onChange={e => setNewDefectCat(p => ({ ...p, defectCatEnglish: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Descripción de Defecto" value={newDefectCat.descripcionDefecto} onChange={e => setNewDefectCat(p => ({ ...p, descripcionDefecto: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="CAT ESPAÑOL" value={newDefectCat.catEspanol} onChange={e => setNewDefectCat(p => ({ ...p, catEspanol: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="ACR Español" value={newDefectCat.acrSpanish} onChange={e => setNewDefectCat(p => ({ ...p, acrSpanish: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Defecto CAT Español" value={newDefectCat.defectCatSpanish} onChange={e => setNewDefectCat(p => ({ ...p, defectCatSpanish: e.target.value }))} />
                    <div className="flex items-end">
                      <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleSaveDefectCatalog} disabled={savingDefectCat || !newDefectCat.defectCode}>
                        {savingDefectCat ? 'Guardando...' : 'Agregar'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={defectCatalogSearch}
                        onChange={e => setDefectCatalogSearch(e.target.value)}
                        placeholder="Buscar por código, descripción EN o ES..."
                        className="border-border bg-input pl-10"
                      />
                    </div>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" id="excel-upload" />
                    <Button size="sm" variant="outline" disabled={importingExcel} onClick={() => document.getElementById('excel-upload')?.click()}>
                      <Upload className="mr-2 h-4 w-4" />Importar Excel (A-I)
                    </Button>
                    {importProgress && (
                      <span className={`text-xs ${importProgress.includes('✅') ? 'text-green-500' : importProgress.includes('❌') ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {importProgress}
                      </span>
                    )}
                  </div>
                </div>

                {defectCatalogItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border rounded-lg border-border">
                    No hay items en el catálogo de defectos.
                  </div>
                ) : defectCatalogItems.filter(c => {
                  if (!defectCatalogSearch) return true;
                  const q = defectCatalogSearch.toLowerCase();
                  return (c.defectCode || '').toLowerCase().includes(q)
                    || (c.defectDescription || '').toLowerCase().includes(q)
                    || (c.descripcionDefecto || '').toLowerCase().includes(q);
                }).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border rounded-lg border-border">
                    No se encontraron resultados para "{defectCatalogSearch}".
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/10 border-b border-border">
                          <th className="p-2 text-left font-medium text-primary">Código Defecto</th>
                          <th className="p-2 text-left font-medium text-primary">Descripción</th>
                          <th className="p-2 text-left font-medium text-primary">CAT EN</th>
                          <th className="p-2 text-left font-medium text-primary">ACR</th>
                          <th className="p-2 text-left font-medium text-primary">Defect CAT EN</th>
                          <th className="p-2 text-left font-medium text-primary">Descripción Defecto</th>
                          <th className="p-2 text-left font-medium text-primary">CAT ES</th>
                          <th className="p-2 text-left font-medium text-primary">ACR S</th>
                          <th className="p-2 text-left font-medium text-primary">Defect CAT ES</th>
                          <th className="p-2 text-center font-medium text-primary">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defectCatalogItems.filter(c => {
                          if (!defectCatalogSearch) return true;
                          const q = defectCatalogSearch.toLowerCase();
                          return (c.defectCode || '').toLowerCase().includes(q)
                            || (c.defectDescription || '').toLowerCase().includes(q)
                            || (c.descripcionDefecto || '').toLowerCase().includes(q);
                        }).map(c => (
                          <tr key={c.id} className="border-b border-border hover:bg-muted/20">
                            <td className="p-2 font-medium">{c.defectCode}</td>
                            <td className="p-2 text-xs">{c.defectDescription || '-'}</td>
                            <td className="p-2 text-xs">{c.catEnglish || '-'}</td>
                            <td className="p-2 text-xs">{c.acr || '-'}</td>
                            <td className="p-2 text-xs">{c.defectCatEnglish || '-'}</td>
                            <td className="p-2 text-xs">{c.descripcionDefecto || '-'}</td>
                            <td className="p-2 text-xs">{c.catEspanol || '-'}</td>
                            <td className="p-2 text-xs">{c.acrSpanish || '-'}</td>
                            <td className="p-2 text-xs">{c.defectCatSpanish || '-'}</td>
                            <td className="p-2 text-center">
                              <button onClick={() => handleDeleteDefectCatalog(c.id)} className="text-destructive hover:text-destructive/70" title="Eliminar">
                                <Trash2 className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {qaDhuOpen && (
              <QADHUModal onClose={() => { setQaDhuOpen(false); setEditingRecord(null); }} onSaved={() => {}} record={editingRecord} />
            )}
            {inLineDefectOpen && (
              <InLineDefectModal onClose={() => { setInLineDefectOpen(false); setEditingDefectRecord(null); }} onSaved={() => {}} record={editingDefectRecord} />
            )}
            {analyticsOpen && (
              <AnalyticsModal
                inlineRecords={qaDhuRecords}
                defectRecords={inLineDefectRecords}
                empleados={empleados}
                defectCatalogItems={defectCatalogItems}
                onClose={() => setAnalyticsOpen(false)}
                isAdmin={currentUser?.rol === 'admin' || currentUser?.rol === 'it-manager'}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
