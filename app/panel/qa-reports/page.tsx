'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanLine, CalendarDays, CalendarRange, BarChart3, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoredUser } from '@/lib/auth-store';
import { tienePermisoEnGrupo, puedeVer } from '@/lib/permisos';
import type { UsuarioIT } from '@/lib/firebase';

const CodeExtractor = dynamic(() => import('@/components/qa-reports/code-extractor').then(m => m.CodeExtractor), { ssr: false });
const WeeklyIssues = dynamic(() => import('@/components/qa-reports/weekly-issues').then(m => m.WeeklyIssues), { ssr: false });
const MonthlyIssues = dynamic(() => import('@/components/qa-reports/monthly-issues').then(m => m.MonthlyIssues), { ssr: false });
const KpiReports = dynamic(() => import('@/components/qa-reports/kpi-reports').then(m => m.KpiReports), { ssr: false });
const WeeklyRegistry = dynamic(() => import('@/components/qa-reports/weekly-registry').then(m => m.WeeklyRegistry), { ssr: false });

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
  const [view, setView] = useState<'tiles' | 'extractor' | 'weekly' | 'monthly' | 'kpi' | 'registry'>('tiles');

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
              <Tile
                title="Extractor"
                subtitle="Codigo de Caja"
                icon={<ScanLine className="h-8 w-8" />}
                color="bg-gradient-to-br from-cyan-500 to-cyan-700"
                onClick={() => setView('extractor')}
              />
            )}
            {puedeVer(currentUser, 'qa_weekly') && (
              <Tile
                title="Weekly Issues"
                subtitle="Issues Semanales"
                icon={<CalendarDays className="h-8 w-8" />}
                color="bg-gradient-to-br from-amber-500 to-amber-700"
                onClick={() => setView('weekly')}
              />
            )}
            {puedeVer(currentUser, 'qa_monthly') && (
              <Tile
                title="Monthly Issues"
                subtitle="Issues Mensuales"
                icon={<CalendarRange className="h-8 w-8" />}
                color="bg-gradient-to-br from-blue-500 to-blue-700"
                onClick={() => setView('monthly')}
              />
            )}
            {puedeVer(currentUser, 'qa_registry') && (
              <Tile
                title="Registro Weekly"
                subtitle="Historial Semanal"
                icon={<Database className="h-8 w-8" />}
                color="bg-gradient-to-br from-purple-500 to-purple-700"
                onClick={() => setView('registry')}
              />
            )}
            {puedeVer(currentUser, 'qa_kpi') && (
              <Tile
                title="KPI Reports"
                subtitle="Reportes KPI"
                icon={<BarChart3 className="h-8 w-8" />}
                color="bg-gradient-to-br from-green-500 to-green-700"
                onClick={() => setView('kpi')}
              />
            )}
          </div>
        )}

        {view === 'extractor' && <CodeExtractor />}
        {view === 'weekly' && <WeeklyIssues />}
        {view === 'monthly' && <MonthlyIssues />}
        {view === 'registry' && <WeeklyRegistry />}
        {view === 'kpi' && <KpiReports />}
      </div>
    </main>
  );
}
