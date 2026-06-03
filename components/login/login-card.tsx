'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getUsuariosIT, getEmpleadoByCodigo, type UsuarioIT, type Empleado } from '@/lib/firebase';

interface LoginCardProps {
  onLoginSuccess: (user: UsuarioIT) => void;
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

function validateUsernameLocal(value: string, allUsers: { username: string }[]): AIValidation {
  const input = value.toLowerCase().trim();
  const usernames = allUsers.map(u => u.username);

  if (input.length < 3) {
    return { match: 'none', matchedUser: null, similarity: 0, suggestion: 'IA: Por favor ingrese al menos 3 caracteres.' };
  }

  // 1. Exact match?
  const exact = usernames.find(u => u.toLowerCase() === input);
  if (exact) {
    return { match: 'exact', matchedUser: exact, similarity: 100, suggestion: 'IA: Usuario reconocido. Por favor ingrese su PIN.' };
  }

  // 2. Sigue escribiendo? — si es prefijo de algun usuario, esperar sin mostrar error
  const prefixUser = usernames.find(u => u.toLowerCase().startsWith(input));
  if (prefixUser) {
    return { match: 'prefix', matchedUser: prefixUser, similarity: 0, suggestion: `IA: Coincide con "${prefixUser}"... siga escribiendo.` };
  }

  // 3. Similar (error ortografico)
  const scored = usernames
    .map(u => ({ username: u, score: similarity(input, u) }))
    .filter(s => s.score >= 50)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score >= 70) {
    const best = scored[0];
    return { match: 'similar', matchedUser: best.username, similarity: best.score, suggestion: `IA: Quizas quiso decir "${best.username}"? (${best.score}% de coincidencia)` };
  }

  // 4. No encontrado
  return { match: 'none', matchedUser: null, similarity: 0, suggestion: 'IA: Usuario no encontrado en el sistema.' };
}

export function LoginCard({ onLoginSuccess, onRequestSupport }: LoginCardProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState<'username' | 'pin'>('username');
  const [aiMessage, setAiMessage] = useState('IA: Esperando identificación...');
  const [matchedUser, setMatchedUser] = useState<UsuarioIT | null>(null);
  const [similarUser, setSimilarUser] = useState<string | null>(null);
  const [showSupportBtn, setShowSupportBtn] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [allUsers, setAllUsers] = useState<UsuarioIT[]>([]);
  const [employee, setEmployee] = useState<Empleado | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRef = useRef('');

  useEffect(() => {
    async function loadUsers() {
      const users = await getUsuariosIT();
      setAllUsers(users);
    }
    loadUsers();
  }, []);

  useEffect(() => {
    if (matchedUser) {
      getEmpleadoByCodigo(matchedUser.codigo).then(setEmployee);
    } else {
      setEmployee(null);
    }
  }, [matchedUser]);

  const doValidate = useCallback(() => {
    const value = usernameRef.current;
    if (value.length < 3) return;

    const result = validateUsernameLocal(value, allUsers.filter(u => u.activo).map(u => ({ username: u.username })));

    if (result.match === 'exact') {
      const user = allUsers.find(u => u.username.toLowerCase() === result.matchedUser?.toLowerCase());
      if (user) {
        setMatchedUser(user);
        setStep('pin');
        setAiMessage('IA: Usuario reconocido. Por favor ingrese su PIN.');
        setShowSupportBtn(false);
      }
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
  }, [allUsers]);

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

    if (value.length === 6 && matchedUser) {
      if (value === matchedUser.pin) {
        setAiMessage('IA: Acceso concedido. Bienvenido.');
        setTimeout(() => onLoginSuccess(matchedUser), 500);
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
    }
  };

  const handleSupportRequest = () => {
    onRequestSupport(username, similarUser);
  };

  const resetLogin = () => {
    setStep('username');
    setUsername('');
    setPin('');
    setMatchedUser(null);
    setSimilarUser(null);
    setShowSupportBtn(false);
    setPinAttempts(0);
    setAiMessage('IA: Esperando identificación...');
  };

  return (
    <Card className="w-full max-w-lg border-primary/20 bg-card/95 shadow-[0_0_30px_rgba(0,242,255,0.1)] backdrop-blur-xl">
      <CardContent className="flex items-center gap-6 p-8">
        {/* Avatar / Employee Photo */}
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border bg-background">
          {matchedUser && employee?.foto ? (
            <Avatar className="h-full w-full rounded-none">
              <AvatarImage src={employee.foto} alt={matchedUser.username} className="h-full w-full object-cover" />
              <AvatarFallback className="rounded-none text-2xl font-bold text-primary">
                {matchedUser.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <MessageCircle className="h-12 w-12 text-primary" />
          )}
        </div>

        {/* Form Section */}
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-bold tracking-wide text-primary">
            SYSTEM JABM
          </h2>

          {/* AI Message */}
          <div className="flex min-h-12 items-center rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            {aiMessage}
          </div>

          {/* Username Input */}
          {step === 'username' && (
            <Input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => handleValidateUsername(e.target.value)}
              className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
          )}

          {/* PIN Input */}
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
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={resetLogin}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Cambiar usuario
              </button>
            </div>
          )}

          {/* Support Button */}
          {showSupportBtn && (
            <Button
              onClick={handleSupportRequest}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Asistencia de IT
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
