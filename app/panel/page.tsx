'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Settings, LogOut, Shield, BarChart3, Notebook } from 'lucide-react';
import { getStoredUser, removeStoredUser, type SafeUser } from '@/lib/auth-store';
import type { Empleado } from '@/lib/firebase';
import { tienePermiso, tienePermisoEnGrupo } from '@/lib/permisos';
import { useLang } from '@/lib/lang-context';

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
      className={`group relative min-h-44 min-w-44 overflow-hidden rounded-3xl border-2 border-primary/40 p-6 text-left transition-all duration-200 hover:scale-105 hover:border-primary hover:shadow-[0_0_40px_rgba(0,242,255,0.3)] ${color}`}
    >
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 opacity-10 mix-blend-lighten">
        <div className="absolute left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-radial from-white/50 to-transparent blur-xl" />
      </div>
      
      <div className="relative z-10">
        <div className="mb-3 text-4xl text-white/90">{icon}</div>
        <div className="text-lg font-bold text-white">{title}</div>
        <div className="text-sm text-white/70">{subtitle}</div>
      </div>
    </button>
  );
}

export default function PanelPage() {
  const router = useRouter();
  const { t } = useLang();
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [empleadoData, setEmpleadoData] = useState<Empleado | null>(null);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);

    import('@/lib/firebase').then(({ getEmpleadoByCodigo }) => {
      getEmpleadoByCodigo(user.codigo).then((emp) => {
        if (emp) {
          setEmpleadoData(emp);
          const names = emp.nombres.split(' ');
          const lastNames = emp.apellidos.split(' ');
          setDisplayName(`${names.slice(0, 2).join(' ')} ${lastNames[0]}`);
        }
      });
    });
  }, [router]);

  const handleLogout = () => {
    removeStoredUser();
    router.push('/');
  };

  const isITManager = currentUser ? tienePermiso(currentUser, 'itManager') : false;
  const tieneRRHH = currentUser ? tienePermisoEnGrupo(currentUser, 'rrhh_') : false;
  const tieneQA = currentUser ? tienePermisoEnGrupo(currentUser, 'qa_') : false;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-center text-2xl font-black tracking-wider text-primary">
          {t('dashboard.title')}
        </h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </button>
      </div>

      {/* Welcome message */}
      {currentUser && (
        <p className="mb-8 text-center text-muted-foreground">
          {t('dashboard.welcome')}, <span className="font-semibold text-foreground">{displayName || currentUser.username}</span>
        </p>
      )}

      {/* Tiles */}
      <div className="flex flex-wrap justify-center gap-10">
        {tieneRRHH && (
          <Tile
            title={t('dashboard.rrhh')}
            subtitle={t('dashboard.rrhh_sub')}
            icon={<Users className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.5_0.18_290)] to-[oklch(0.35_0.15_290)]"
            onClick={() => router.push('/panel/rrhh')}
          />
        )}

        {tieneQA && (
          <Tile
            title={t('dashboard.qa_reports')}
            subtitle={t('dashboard.qa_reports_sub')}
            icon={<BarChart3 className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.6_0.18_60)] to-[oklch(0.45_0.15_60)]"
            onClick={() => router.push('/panel/qa-reports')}
          />
        )}

        {isITManager && (
          <Tile
            title={t('dashboard.it_manager')}
            subtitle={t('dashboard.it_manager_sub')}
            icon={<Shield className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.5_0.15_170)] to-[oklch(0.35_0.12_170)]"
            onClick={() => router.push('/panel/it-manager')}
          />
        )}

        <Tile
          title={t('dashboard.agenda')}
          subtitle={t('dashboard.agenda_sub')}
          icon={<Notebook className="h-10 w-10" />}
          color="bg-gradient-to-br from-[oklch(0.5_0.12_40)] to-[oklch(0.35_0.10_40)]"
          onClick={() => router.push('/panel/agenda')}
        />
        <Tile
          title={t('dashboard.settings')}
          subtitle={t('dashboard.settings_sub')}
          icon={<Settings className="h-10 w-10" />}
          color="bg-gradient-to-br from-[oklch(0.4_0.02_250)] to-[oklch(0.25_0.01_250)]"
          onClick={() => {}}
        />
      </div>
    </main>
  );
}
