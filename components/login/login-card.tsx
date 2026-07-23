'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getEmpleadoByCodigo, type Empleado } from '@/lib/firebase';
import { setAuthToken, setStoredUser, type SafeUser } from '@/lib/auth-store';

interface LoginCardProps {
  onLoginSuccess: (user: SafeUser & { token: string }) => void;
  onRequestSupport: (username: string, similarUser: string | null) => void;
}

interface AIValidation {
  match: 'exact' | 'similar' | 'prefix' | 'none';
  matchedUser: string | null;
  similarity: number;
  suggestion: string;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 100 : Math.round((1 - dist / maxLen) * 100);
}

// Minimal username list fetched from server (NO PINs, NO sensitive data)
interface UsernameOnly { username: string; activo: boolean; codigo: string; }

async function fetchUsernames(): Promise<UsernameOnly[]> {
  try {
    const res = await fetch('/api/auth/login', { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.usernames || [];
  } catch { return []; }
}

function validateUsernameLocal(value: string, usernames: string[]): AIValidation {
  const input = value.toLowerCase().trim();
  if (input.length < 3) {
    return { match: 'none', matchedUser: null, similarity: 0, suggestion: 'IA: Por favor ingrese al menos 3 caracteres.' };
  }
  const exact = usernames.find(u => u.toLowerCase() === input);
  if (exact) {
    return { match: 'exact', matchedUser: exact, similarity: 100, suggestion: 'IA: Usuario reconocido. Por favor ingrese su PIN.' };
  }
  const prefixUser = usernames.find(u => u.toLowerCase().startsWith(input));
  if (prefixUser) {
    return { match: 'prefix', matchedUser: prefixUser, similarity: 0, suggestion: `IA: Coincide con "${prefixUser}"... siga escribiendo.` };
  }
  const scored = usernames
    .map(u => ({ username: u, score: similarity(input, u) }))
    .filter(s => s.score >= 50)
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0 && scored[0].score >= 70) {
    const best = scored[0];
    return { match: 'similar', matchedUser: best.username, similarity: best.score, suggestion: `IA: Quizas quiso decir "${best.username}"? (${best.score}% de coincidencia)` };
  }
  return { match: 'none', matchedUser: null, similarity: 0, suggestion: 'IA: Usuario no encontrado en el sistema.' };
}

export function LoginCard({ onLoginSuccess, onRequestSupport }: LoginCardProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState<'username' | 'pin'>('username');
  const [aiMessage, setAiMessage] = useState('IA: Esperando identificación...');
  const [matchedUsername, setMatchedUsername] = useState<string | null>(null);
  const [matchedUserCodigo, setMatchedUserCodigo] = useState<string | null>(null);
  const [similarUser, setSimilarUser] = useState<string | null>(null);
  const [showSupportBtn, setShowSupportBtn] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<Empleado | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRef = useRef('');
  const usernamesRef = useRef<string[]>([]);
  const codigoRef = useRef<string | null>(null);

  // Fetch only usernames (no PINs) on mount
  useEffect(() => {
    fetchUsernames().then(users => {
      usernamesRef.current = users.filter(u => u.activo).map(u => u.username);
    });
  }, []);

  useEffect(() => {
    if (matchedUserCodigo) {
      getEmpleadoByCodigo(matchedUserCodigo).then(setEmployee);
    } else {
      setEmployee(null);
    }
  }, [matchedUserCodigo]);

  const doValidate = useCallback(() => {
    const value = usernameRef.current;
    if (value.length < 3) return;
    const result = validateUsernameLocal(value, usernamesRef.current);

    if (result.match === 'exact') {
      // Find the codigo for this username from the cached list
      setMatchedUsername(result.matchedUser);
      setStep('pin');
      setAiMessage('IA: Usuario reconocido. Por favor ingrese su PIN.');
      setShowSupportBtn(false);
    } else if (result.match === 'prefix') {
      setAiMessage(result.suggestion);
      setShowSupportBtn(false);
    } else if (result.match === 'similar') {
      setSimilarUser(result.matchedUser);
      setShowSupportBtn(true);
      setAiMessage(result.suggestion);
    } else {
      setAiMessage('IA: Usuario no encontrado en el sistema.');
      setShowSupportBtn(true);
    }
  }, []);

  const handleValidateUsername = (value: string) => {
    usernameRef.current = value;
    setUsername(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setShowSupportBtn(false);
      setSimilarUser(null);
      setAiMessage('IA: Esperando identificación...');
      return;
    }
    setAiMessage('IA: Analizando...');
    debounceRef.current = setTimeout(doValidate, 400);
  };

  const validatePIN = async (value: string) => {
    setPin(value);
    if (value.length === 6 && matchedUsername && !loading) {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: matchedUsername, pin: value }),
        });
        const data = await res.json();

        if (res.ok && data.token && data.user) {
          setAuthToken(data.token);
          setStoredUser(data.user);
          setAiMessage('IA: Acceso concedido. Bienvenido.');
          setTimeout(() => onLoginSuccess({ ...data.user, token: data.token }), 500);
        } else {
          const newAttempts = pinAttempts + 1;
          setPinAttempts(newAttempts);
          setPin('');
          if (newAttempts >= 3) {
            setAiMessage('IA: Demasiados intentos fallidos. Puede solicitar asistencia de IT.');
            setShowSupportBtn(true);
          } else {
            setAiMessage(`IA: PIN incorrecto. Intento ${newAttempts}/3`);
          }
        }
      } catch {
        setAiMessage('IA: Error de conexión. Intente de nuevo.');
        setPin('');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSupportRequest = () => {
    onRequestSupport(username, similarUser);
  };

  const resetLogin = () => {
    setStep('username');
    setUsername('');
    setPin('');
    setMatchedUsername(null);
    setMatchedUserCodigo(null);
    setSimilarUser(null);
    setShowSupportBtn(false);
    setPinAttempts(0);
    setAiMessage('IA: Esperando identificación...');
  };

  return (
    <Card className="w-full max-w-lg border-primary/20 bg-card/95 shadow-[0_0_30px_rgba(0,242,255,0.1)] backdrop-blur-xl">
      <CardContent className="flex items-center gap-6 p-8">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border bg-background">
          {matchedUsername && employee?.foto ? (
            <Avatar className="h-full w-full rounded-none">
              <AvatarImage src={employee.foto} alt={matchedUsername} className="h-full w-full object-cover" />
              <AvatarFallback className="rounded-none text-2xl font-bold text-primary">
                {matchedUsername.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <MessageCircle className="h-12 w-12 text-primary" />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-bold tracking-wide text-primary">SYSTEM JABM</h2>
          <div className="flex min-h-12 items-center rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            {aiMessage}
          </div>
          {step === 'username' && (
            <Input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => handleValidateUsername(e.target.value)}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          )}
          {step === 'pin' && (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPin ? 'text' : 'password'}
                  placeholder="PIN (6 dígitos)"
                  value={pin}
                  onChange={(e) => validatePIN(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  className="border-border bg-input pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button onClick={resetLogin} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                Cambiar usuario
              </button>
            </div>
          )}
          {showSupportBtn && (
            <Button onClick={handleSupportRequest} className="w-full bg-blue-600 text-white hover:bg-blue-700">
              <MessageCircle className="mr-2 h-4 w-4" />
              Asistencia de IT
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
