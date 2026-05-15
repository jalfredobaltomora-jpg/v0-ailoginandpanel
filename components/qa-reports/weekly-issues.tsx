'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Plus, CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { get, ref, db, push, set, update } from '@/lib/firebase';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  status: 'abierto' | 'en-progreso' | 'resuelto' | 'cerrado';
  reportedBy: string;
  date: string;
  resolvedAt?: string;
}

const severityColors: Record<string, string> = {
  baja: 'bg-gray-500/20 text-gray-400',
  media: 'bg-blue-500/20 text-blue-400',
  alta: 'bg-orange-500/20 text-orange-400',
  critica: 'bg-red-500/20 text-red-400',
};

const statusColors: Record<string, string> = {
  abierto: 'bg-red-500/20 text-red-400',
  'en-progreso': 'bg-amber-500/20 text-amber-400',
  resuelto: 'bg-green-500/20 text-green-400',
  cerrado: 'bg-muted text-muted-foreground',
};

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function isInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function WeeklyIssues() {
  return <IssueList mode="weekly" title="Weekly Issues" subtitle="Issues de esta semana" range={getWeekRange()} />;
}

export function MonthlyIssues() {
  return <IssueList mode="monthly" title="Monthly Issues" subtitle="Issues de este mes" range={getMonthRange()} />;
}

function IssueList({ mode, title, subtitle, range }: { mode: string; title: string; subtitle: string; range: { start: string; end: string } }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<string>('media');
  const [newReportedBy, setNewReportedBy] = useState('');

  const loadIssues = async () => {
    const snapshot = await get(ref(db, 'qa-issues'));
    const all: Record<string, Issue> = snapshot.val() || {};
    const filtered = Object.values(all)
      .filter(i => isInRange(i.date, range.start, range.end))
      .sort((a, b) => b.date.localeCompare(a.date));
    setIssues(filtered);
    setLoading(false);
  };

  useEffect(() => { loadIssues(); }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newReportedBy.trim()) return;
    const newRef = push(ref(db, 'qa-issues'));
    await set(newRef, {
      id: newRef.key,
      title: newTitle.trim(),
      description: newDesc.trim(),
      severity: newSeverity,
      status: 'abierto',
      reportedBy: newReportedBy.trim(),
      date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
    setNewTitle('');
    setNewDesc('');
    setNewReportedBy('');
    await loadIssues();
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updates: Record<string, string> = { status };
    if (status === 'resuelto' || status === 'cerrado') {
      updates.resolvedAt = new Date().toISOString().split('T')[0];
    }
    await update(ref(db, `qa-issues/${id}`), updates);
    await loadIssues();
  };

  const getWeekDayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <Card className="mx-auto max-w-4xl border-primary/20 bg-card/95">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              {mode === 'weekly' ? <CalendarDays className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
              {title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {subtitle}: {range.start} al {range.end}
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Cerrar' : 'Nuevo Issue'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* New issue form */}
        {showForm && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Titulo *</label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Resumen del issue" className="border-border bg-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Reportado por *</label>
                <Input value={newReportedBy} onChange={(e) => setNewReportedBy(e.target.value)} placeholder="Nombre o usuario" className="border-border bg-input" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Descripcion</label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Describa el issue..." className="border-border bg-input min-h-20" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-40">
                <label className="mb-1 block text-xs text-muted-foreground">Severidad</label>
                <Select value={newSeverity} onValueChange={setNewSeverity}>
                  <SelectTrigger className="border-border bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Critica</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || !newReportedBy.trim()} className="mt-5 bg-primary text-primary-foreground">
                Crear Issue
              </Button>
            </div>
          </div>
        )}

        {/* Issues list */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando...</div>
        ) : issues.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>No hay issues registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map(issue => (
              <div key={issue.id} className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">{issue.title}</h4>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityColors[issue.severity]}`}>
                        {issue.severity}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColors[issue.status]}`}>
                        {issue.status === 'en-progreso' ? 'En progreso' : issue.status}
                      </span>
                    </div>
                    {issue.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {issue.reportedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getWeekDayName(issue.date)}
                      </span>
                      {issue.resolvedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Resuelto: {getWeekDayName(issue.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {issue.status !== 'cerrado' && (
                    <div className="flex items-center gap-1 shrink-0">
                      {issue.status === 'abierto' && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(issue.id, 'en-progreso')} className="text-amber-500 hover:text-amber-400">
                          Iniciar
                        </Button>
                      )}
                      {(issue.status === 'abierto' || issue.status === 'en-progreso') && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(issue.id, 'resuelto')} className="text-green-500 hover:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {issue.status === 'resuelto' && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(issue.id, 'cerrado')} className="text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
