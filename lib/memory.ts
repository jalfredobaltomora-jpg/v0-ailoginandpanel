const FB_URL = 'https://system-control-administrative-default-rtdb.firebaseio.com';
const MEM_PATH = 'jab_memory';

type FactEntry = { fact: string; type: 'tecnico' | 'usuario' | 'problema' | 'solucion' | 'nota'; fecha: string };
type SessionEntry = { resumen: string; fecha: string };

async function fbGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${FB_URL}/${path}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fbPush(path: string, data: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${FB_URL}/${path}.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    return res.ok;
  } catch { return false; }
}

// ─── Facts ───
export async function recordFact(fact: string, type: FactEntry['type']): Promise<boolean> {
  return fbPush(`${MEM_PATH}/facts`, { fact, type, fecha: new Date().toISOString() });
}

export async function getRecentFacts(limit = 10): Promise<FactEntry[]> {
  const data = await fbGet<Record<string, FactEntry>>(`${MEM_PATH}/facts`);
  if (!data) return [];
  return Object.values(data).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, limit);
}

export async function searchFacts(query: string): Promise<FactEntry[]> {
  const data = await fbGet<Record<string, FactEntry>>(`${MEM_PATH}/facts`);
  if (!data) return [];
  const q = query.toLowerCase();
  return Object.values(data).filter(f => f.fact.toLowerCase().includes(q)).slice(0, 5);
}

export async function deleteFact(fact: string): Promise<boolean> {
  const data = await fbGet<Record<string, FactEntry>>(`${MEM_PATH}/facts`);
  if (!data) return false;
  const entry = Object.entries(data).find(([, v]) => v.fact === fact);
  if (!entry) return false;
  try {
    const res = await fetch(`${FB_URL}/${MEM_PATH}/facts/${entry[0]}.json`, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

// ─── Sessions ───
export async function recordSession(resumen: string): Promise<boolean> {
  return fbPush(`${MEM_PATH}/sessions`, { resumen, fecha: new Date().toISOString() });
}

export async function getRecentSessions(limit = 5): Promise<SessionEntry[]> {
  const data = await fbGet<Record<string, SessionEntry>>(`${MEM_PATH}/sessions`);
  if (!data) return [];
  return Object.values(data).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, limit);
}

// ─── Context builder ───
export async function buildMemoryContext(): Promise<string> {
  const facts = await getRecentFacts(8);
  const sessions = await getRecentSessions(3);

  const parts: string[] = [];
  if (facts.length > 0) {
    parts.push('📌 Hechos registrados:');
    facts.forEach(f => parts.push(`- [${f.type}] ${f.fact}`));
  }
  if (sessions.length > 0) {
    parts.push('📋 Sesiones recientes:');
    sessions.forEach(s => parts.push(`- ${s.fecha.split('T')[0]}: ${s.resumen}`));
  }
  return parts.length > 0 ? parts.join('\n') : '';
}

// ─── Auto-learn from conversation ───
export async function learnFromInteraction(userMsg: string, aiResponse: string): Promise<void> {
  const lower = userMsg.toLowerCase();
  // Detect problems
  if (/(error|falla|no funciona|bug|problema|ticket)/i.test(lower)) {
    const summary = userMsg.length > 80 ? userMsg.slice(0, 80) + '...' : userMsg;
    await recordFact(`Usuario reportó: "${summary}"`, 'problema');
  }
  // Detect solutions
  if (/(solución|solucioné|arreglé|resolví|cambié|configuré)/i.test(lower)) {
    const summary = userMsg.length > 80 ? userMsg.slice(0, 80) + '...' : userMsg;
    await recordFact(`Solución aplicada: "${summary}"`, 'solucion');
  }
  // Detect technical notes
  if (/(apunta|nota|recuerda|importante|documenta)/i.test(lower)) {
    const note = userMsg.replace(/^(apunta|nota|recuerda|importante|documenta)\s*/i, '');
    const summary = note.length > 100 ? note.slice(0, 100) + '...' : note;
    await recordFact(summary, 'nota');
  }
}
