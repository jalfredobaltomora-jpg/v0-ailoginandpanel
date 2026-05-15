'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, MessageSquare, Bell, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SupportQueue } from '@/components/it-manager/support-queue';
import { listenToSupportRequests, type SupportRequest, type UsuarioIT } from '@/lib/firebase';

interface TileProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  badge?: number;
}

function Tile({ title, subtitle, icon, color, onClick, badge }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative min-h-44 min-w-44 overflow-hidden rounded-3xl border-2 border-primary/40 p-6 text-left transition-all duration-200 hover:scale-105 hover:border-primary hover:shadow-[0_0_40px_rgba(0,242,255,0.3)] ${color}`}
    >
      {badge !== undefined && badge > 0 && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {badge}
        </div>
      )}
      
      <div className="relative z-10">
        <div className="mb-3 text-4xl text-white/90">{icon}</div>
        <div className="text-lg font-bold text-white">{title}</div>
        <div className="text-sm text-white/70">{subtitle}</div>
      </div>
    </button>
  );
}

export default function ITManagerPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioIT | null>(null);
  const [view, setView] = useState<'tiles' | 'support'>('tiles');
  const [pendingRequests, setPendingRequests] = useState<SupportRequest[]>([]);

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
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    const unsubscribe = listenToSupportRequests((requests) => {
      setPendingRequests(requests.filter(r => r.status === 'pending'));
    });
    return unsubscribe;
  }, []);

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => view === 'tiles' ? router.push('/panel') : setView('tiles')}
          className="border-border"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {view === 'tiles' ? 'Regresar' : 'Volver'}
        </Button>
        <h1 className="text-2xl font-black tracking-wider text-primary">
          IT Manager <span className="text-foreground">(Panel)</span>
        </h1>
      </div>

      {view === 'tiles' && (
        <div className="flex flex-wrap justify-center gap-10">
          <Tile
            title="Usuarios"
            subtitle="Gestión de usuarios"
            icon={<Users className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.45_0.15_250)] to-[oklch(0.3_0.12_250)]"
            onClick={() => router.push('/panel/it-manager/usuarios')}
          />

          <Tile
            title="Soporte"
            subtitle="Solicitudes de ayuda"
            icon={<MessageSquare className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.5_0.15_170)] to-[oklch(0.35_0.12_170)]"
            onClick={() => setView('support')}
            badge={pendingRequests.length}
          />

          <Tile
            title="Notificaciones"
            subtitle="Alertas del sistema"
            icon={<Bell className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.6_0.18_60)] to-[oklch(0.45_0.15_60)]"
            onClick={() => {}}
          />

          <Tile
            title="IDE Visual"
            subtitle="Editor de codigo"
            icon={<Code2 className="h-10 w-10" />}
            color="bg-gradient-to-br from-[oklch(0.55_0.2_280)] to-[oklch(0.4_0.15_280)]"
            onClick={() => router.push('/panel/it-manager/ide')}
          />
        </div>
      )}

      {view === 'support' && (
        <Card className="mx-auto max-w-6xl border-primary/20 bg-card/95">
          <CardHeader>
            <CardTitle className="text-primary">Solicitudes de Soporte</CardTitle>
          </CardHeader>
          <CardContent>
            <SupportQueue />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
