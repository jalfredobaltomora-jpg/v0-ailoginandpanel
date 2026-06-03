'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Circle, Plus, Trash2, Star, CalendarDays, ChevronRight, ChevronDown, AlertCircle, Sparkles, ListTodo } from 'lucide-react';
import { getStoredUser } from '@/lib/auth-store';
import { listenToAgendaNotes } from '@/lib/firebase';
import type { UsuarioIT, AgendaNote } from '@/lib/firebase';
import { getWeekNumber } from '@/lib/alarm-engine';

type ViewMode = 'today' | 'history';
type HistoryLevel = 'years' | 'months' | 'weeks' | 'days';

export default function AgendaPage() {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioIT | null>(null);
  const [notes, setNotes] = useState<AgendaNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [view, setView] = useState<ViewMode>('today');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber());
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().slice(0, 10));
  const [historyLevel, setHistoryLevel] = useState<HistoryLevel>('years');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.push('/'); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;
    listenToAgendaNotes(user.codigo, setNotes).then(u => { if (!cancelled) unsub = u; });
    return () => { cancelled = true; unsub?.(); };
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);

  const addNote = useCallback(async () => {
    const text = newNote.trim();
    if (!text || !user) return;
    const now = new Date();
    const { saveAgendaNote } = await import('@/lib/firebase');
    await saveAgendaNote(user.codigo, {
      text,
      date: today,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      week: getWeekNumber(now),
      day: now.getDate(),
      done: false,
      priority: 2,
      createdAt: Date.now(),
    });
    setNewNote('');
  }, [newNote, user, today]);

  const toggleDone = useCallback(async (note: AgendaNote) => {
    if (!user) return;
    const { updateAgendaNote } = await import('@/lib/firebase');
    await updateAgendaNote(user.codigo, note.id, {
      done: !note.done,
      completedAt: !note.done ? Date.now() : undefined,
    });
  }, [user]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!user) return;
    const { deleteAgendaNote } = await import('@/lib/firebase');
    await deleteAgendaNote(user.codigo, noteId);
  }, [user]);

  const setPriority = useCallback(async (note: AgendaNote, p: number) => {
    if (!user) return;
    const { updateAgendaNote } = await import('@/lib/firebase');
    await updateAgendaNote(user.codigo, note.id, { priority: p });
  }, [user]);

  // Filter notes for current view
  const todayNotes = notes.filter(n => n.date === today);
  const pendingToday = todayNotes.filter(n => !n.done);
  const doneToday = todayNotes.filter(n => n.done);

  // History data
  const years = [...new Set(notes.map(n => n.year))].sort((a, b) => b - a);
  const monthsInYear = [...new Set(notes.filter(n => n.year === selectedYear).map(n => n.month))].sort((a, b) => b - a);
  const weeksInMonth = [...new Set(notes.filter(n => n.year === selectedYear && n.month === selectedMonth).map(n => n.week))].sort((a, b) => b - a);
  const daysInWeek = [...new Set(notes.filter(n => n.year === selectedYear && n.month === selectedMonth && n.week === selectedWeek).map(n => n.date))].sort().reverse();
  const dayNotes = notes.filter(n => n.date === selectedDay);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const pendingCount = pendingToday.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/panel')} className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Agenda Personal</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('today')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${view === 'today' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-accent'}`}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </button>
            <button onClick={() => setView('history')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${view === 'history' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-accent'}`}>
              <CalendarDays className="inline h-4 w-4 mr-1" />Historial
            </button>
          </div>
        </div>

        {view === 'today' && (
          <>
            {/* Today summary */}
            {pendingCount > 0 && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                Tienes {pendingCount} {pendingCount === 1 ? 'tarea pendiente' : 'tareas pendientes'} hoy
              </div>
            )}

            {/* Add note */}
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                placeholder="Nueva nota (JAB también puede guardarlas por voz)..."
                className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={addNote} disabled={!newNote.trim()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Pending notes */}
            {pendingToday.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground/80">Pendientes</h2>
                <div className="space-y-2">
                  {pendingToday.sort((a, b) => (a.priority || 2) - (b.priority || 2)).map(note => (
                    <NoteCard key={note.id} note={note} onToggle={toggleDone} onDelete={deleteNote} onPriority={setPriority} />
                  ))}
                </div>
              </div>
            )}

            {/* Done notes */}
            {doneToday.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-green-500/80">Completadas ({doneToday.length})</h2>
                <div className="space-y-2 opacity-60">
                  {doneToday.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).map(note => (
                    <NoteCard key={note.id} note={note} onToggle={toggleDone} onDelete={deleteNote} onPriority={setPriority} />
                  ))}
                </div>
              </div>
            )}

            {todayNotes.length === 0 && (
              <div className="mt-12 text-center text-muted-foreground">
                <ListTodo className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm">No hay notas para hoy. ¡Empieza a escribir o dile a JAB que guarde notas por voz!</p>
              </div>
            )}
          </>
        )}

        {view === 'history' && (
          <div>
            <div className="mb-4 flex gap-2 text-xs">
              {(['years', 'months', 'weeks', 'days'] as HistoryLevel[]).map(level => (
                <button key={level} onClick={() => setHistoryLevel(level)} className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${historyLevel === level ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-accent'}`}>
                  {level === 'years' ? 'Años' : level === 'months' ? 'Meses' : level === 'weeks' ? 'Semanas' : 'Días'}
                </button>
              ))}
            </div>

            {historyLevel === 'years' && (
              <div className="space-y-2">
                {years.map(year => (
                  <button key={year} onClick={() => { setSelectedYear(year); setHistoryLevel('months'); }} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left hover:bg-accent transition-colors">
                    <span className="text-lg font-semibold">{year}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {historyLevel === 'months' && (
              <div>
                <button onClick={() => setHistoryLevel('years')} className="mb-3 text-xs text-primary hover:underline">&larr; Volver a años</button>
                <div className="space-y-2">
                  {monthsInYear.map(m => {
                    const key = `${selectedYear}-${String(m).padStart(2, '0')}`;
                    const isExpanded = expandedMonths.has(key);
                    const monthNotes = notes.filter(n => n.year === selectedYear && n.month === m);
                    const monthDone = monthNotes.filter(n => n.done).length;
                    return (
                      <div key={key}>
                        <button onClick={() => toggleMonth(key)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-3 text-left hover:bg-accent transition-colors">
                          <span className="font-medium">{monthNames[m - 1]} <span className="text-xs text-muted-foreground">({monthNotes.length} notas, {monthDone} hechas)</span></span>
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isExpanded && (
                          <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                            {monthNotes.sort((a, b) => b.createdAt - a.createdAt).map(note => (
                              <NoteCard key={note.id} note={note} onToggle={toggleDone} onDelete={deleteNote} onPriority={setPriority} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function NoteCard({ note, onToggle, onDelete, onPriority }: {
  note: AgendaNote;
  onToggle: (n: AgendaNote) => void;
  onDelete: (id: string) => void;
  onPriority: (n: AgendaNote, p: number) => void;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${note.done ? 'border-green-500/20 bg-green-500/5' : 'border-border bg-card hover:bg-accent/50'}`}>
      <button onClick={() => onToggle(note)} className={`mt-0.5 transition-colors ${note.done ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}>
        {note.done ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${note.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{note.text}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
          {note.priority <= 1 && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          {note.completedAt && <span className="text-[10px] text-green-600">Hecho {new Date(note.completedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPriority(note, note.priority === 1 ? 2 : note.priority === 2 ? 3 : 1)} className={`rounded-lg p-1.5 transition-colors ${note.priority <= 1 ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground hover:text-amber-400'}`} title="Prioridad">
          <Star className={`h-3.5 w-3.5 ${note.priority <= 1 ? 'fill-amber-400' : ''}`} />
        </button>
        <button onClick={() => onDelete(note.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
