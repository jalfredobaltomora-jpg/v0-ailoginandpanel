'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanLine, CalendarDays, CalendarRange, BarChart3, Database, LineChart, ClipboardList, BookOpen, Trash2, Pencil } from 'lucide-react';
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
  const [dhuTab, setDhuTab] = useState<'inline' | 'catalog'>('inline');
  const [qaDhuOpen, setQaDhuOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [qaDhuRecords, setQaDhuRecords] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [newCatalog, setNewCatalog] = useState({ item: '', style: '', factory: '', line: '', po: '', color: '', buyer: '' });
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    if (view !== 'dhu') return;
    let unsub1: () => void;
    let unsub2: () => void;
    import('@/lib/firebase').then(({ listenToQADHURecords, listenToQADHUCatalog }) => {
      unsub1 = listenToQADHURecords((data: any) => setQaDhuRecords(data));
      unsub2 = listenToQADHUCatalog((data: any) => setCatalogItems(data));
    });
    return () => { if (unsub1) unsub1(); if (unsub2) unsub2(); };
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

  const handleSaveCatalog = async () => {
    if (!newCatalog.item || !newCatalog.factory || !newCatalog.buyer) return;
    setSavingCat(true);
    const { saveQADHUCatalogItem } = await import('@/lib/firebase');
    const user = getStoredUser();
    await saveQADHUCatalogItem({
      ...newCatalog,
      createdAt: Date.now(),
      createdBy: user?.codigo || '',
    });
    setNewCatalog({ item: '', style: '', factory: '', line: '', po: '', color: '', buyer: '' });
    setSavingCat(false);
  };

  const handleDeleteCatalog = async (id: string) => {
    const { deleteQADHUCatalogItem } = await import('@/lib/firebase');
    await deleteQADHUCatalogItem(id);
  };

  const handleEdit = (r: any) => {
    setEditingRecord(r);
    setQaDhuOpen(true);
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
              <h3 className="text-lg font-bold text-foreground">QA - DHU % SAE - Indicator IN LINE</h3>
              {dhuTab === 'inline' && (
                <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => { setEditingRecord(null); setQaDhuOpen(true); }}>
                  + Nuevo Registro
                </Button>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-4 border-b border-border">
              <button onClick={() => setDhuTab('inline')}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${dhuTab === 'inline' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <ClipboardList className="h-4 w-4" /> IN LINE / In Line Defect
              </button>
              <button onClick={() => setDhuTab('catalog')}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${dhuTab === 'catalog' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <BookOpen className="h-4 w-4" /> Catalogo
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
                          <th className="p-2 text-left font-medium text-primary">Creado por</th>
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
                            <td className="p-2 text-xs">{r.auditor}</td>
                            <td className="p-2 text-xs">{r.style || '-'}</td>
                            <td className="p-2 text-xs">{r.visualSample}</td>
                            <td className="p-2 text-xs">{r.visualReject}</td>
                            <td className="p-2 text-xs">{r.visualApproved}</td>
                            <td className="p-2 text-xs">{(r.dhuScorePercent * 100).toFixed(2)}%</td>
                            <td className="p-2">
                              <span className={`text-xs font-bold ${r.performanceDHU === 'Excellent' ? 'text-green-500' : r.performanceDHU === 'Good' ? 'text-yellow-500' : 'text-red-500'}`}>{r.performanceDHU}</span>
                            </td>
                            <td className="p-2 text-xs">{(r.passRateScorePercent * 100).toFixed(2)}%</td>
                            <td className="p-2 text-xs">{r.createdBy || '-'}</td>
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

            {/* Catalogo Tab */}
            {dhuTab === 'catalog' && (
              <div className="space-y-6">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="mb-3 text-sm font-semibold text-foreground">Agregar al Catalogo</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="ITEM *" value={newCatalog.item} onChange={e => setNewCatalog(p => ({ ...p, item: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Style" value={newCatalog.style} onChange={e => setNewCatalog(p => ({ ...p, style: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Factory *" value={newCatalog.factory} onChange={e => setNewCatalog(p => ({ ...p, factory: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Line" value={newCatalog.line} onChange={e => setNewCatalog(p => ({ ...p, line: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="PO" value={newCatalog.po} onChange={e => setNewCatalog(p => ({ ...p, po: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Color" value={newCatalog.color} onChange={e => setNewCatalog(p => ({ ...p, color: e.target.value }))} />
                    <input className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground" placeholder="Buyer *" value={newCatalog.buyer} onChange={e => setNewCatalog(p => ({ ...p, buyer: e.target.value }))} />
                    <div className="flex items-end">
                      <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleSaveCatalog} disabled={savingCat || !newCatalog.item || !newCatalog.factory || !newCatalog.buyer}>
                        {savingCat ? 'Guardando...' : 'Agregar'}
                      </Button>
                    </div>
                  </div>
                </div>

                {catalogItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border rounded-lg border-border">
                    No hay items en el catalogo.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/10 border-b border-border">
                          <th className="p-2 text-left font-medium text-primary">ITEM</th>
                          <th className="p-2 text-left font-medium text-primary">Style</th>
                          <th className="p-2 text-left font-medium text-primary">Factory</th>
                          <th className="p-2 text-left font-medium text-primary">Line</th>
                          <th className="p-2 text-left font-medium text-primary">PO</th>
                          <th className="p-2 text-left font-medium text-primary">Color</th>
                          <th className="p-2 text-left font-medium text-primary">Buyer</th>
                          <th className="p-2 text-center font-medium text-primary">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogItems.map(c => (
                          <tr key={c.id} className="border-b border-border hover:bg-muted/20">
                            <td className="p-2 font-medium">{c.item}</td>
                            <td className="p-2 text-xs">{c.style || '-'}</td>
                            <td className="p-2 text-xs">{c.factory}</td>
                            <td className="p-2 text-xs">{c.line || '-'}</td>
                            <td className="p-2 text-xs">{c.po || '-'}</td>
                            <td className="p-2 text-xs">{c.color || '-'}</td>
                            <td className="p-2 text-xs">{c.buyer}</td>
                            <td className="p-2 text-center">
                              <button onClick={() => handleDeleteCatalog(c.id)} className="text-destructive hover:text-destructive/70" title="Eliminar">
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
          </div>
        )}
      </div>
    </main>
  );
}
