'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanLine, CalendarDays, CalendarRange, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeExtractor } from '@/components/qa-reports/code-extractor';
import { WeeklyIssues } from '@/components/qa-reports/weekly-issues';
import { MonthlyIssues } from '@/components/qa-reports/monthly-issues';
import { KpiReports } from '@/components/qa-reports/kpi-reports';

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
  const [view, setView] = useState<'tiles' | 'extractor' | 'weekly' | 'monthly' | 'kpi'>('tiles');

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
            <Tile
              title="Extractor"
              subtitle="Codigo de Caja"
              icon={<ScanLine className="h-8 w-8" />}
              color="bg-gradient-to-br from-cyan-500 to-cyan-700"
              onClick={() => setView('extractor')}
            />
            <Tile
              title="Weekly Issues"
              subtitle="Issues Semanales"
              icon={<CalendarDays className="h-8 w-8" />}
              color="bg-gradient-to-br from-amber-500 to-amber-700"
              onClick={() => setView('weekly')}
            />
            <Tile
              title="Monthly Issues"
              subtitle="Issues Mensuales"
              icon={<CalendarRange className="h-8 w-8" />}
              color="bg-gradient-to-br from-blue-500 to-blue-700"
              onClick={() => setView('monthly')}
            />
            <Tile
              title="KPI Reports"
              subtitle="Reportes KPI"
              icon={<BarChart3 className="h-8 w-8" />}
              color="bg-gradient-to-br from-green-500 to-green-700"
              onClick={() => setView('kpi')}
            />
          </div>
        )}

        {view === 'extractor' && <CodeExtractor />}
        {view === 'weekly' && <WeeklyIssues />}
        {view === 'monthly' && <MonthlyIssues />}
        {view === 'kpi' && <KpiReports />}
      </div>
    </main>
  );
}
