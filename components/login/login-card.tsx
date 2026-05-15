'use client';

import { useState, useEffect } from 'react';
import { Bot, Eye, EyeOff, MessageCircle, User, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getUsuariosIT, type UsuarioIT } from '@/lib/firebase';

interface LoginCardProps {
  onLoginSuccess: (user: UsuarioIT) => void;
  onRequestSupport: (username: string, similarUser: string | null) => void;
}

interface AIValidation {
  match: 'exact' | 'similar' | 'none';
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

  const exact = usernames.find(u => u.toLowerCase() === input);
  if (exact) {
    return { match: 'exact', matchedUser: exact, similarity: 100, suggestion: 'IA: Usuario reconocido. Por favor ingrese su PIN.' };
  }

  const scored = usernames
    .map(u => ({ username: u, score: similarity(input, u) }))
    .filter(s => s.score >= 40)
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
  const [isValidating, setIsValidating] = useState(false);
  const [matchedUser, setMatchedUser] = useState<UsuarioIT | null>(null);
  const [similarUser, setSimilarUser] = useState<string | null>(null);
  const [showSupportBtn, setShowSupportBtn] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [allUsers, setAllUsers] = useState<UsuarioIT[]>([]);

  useEffect(() => {
    async function loadUsers() {
      const users = await getUsuariosIT();
      setAllUsers(users);
    }
    loadUsers();
  }, []);

  const handleValidateUsername = (value: string) => {
    setUsername(value);
    setShowSupportBtn(false);
    setSimilarUser(null);

    if (value.length < 3) {
      setAiMessage('IA: Esperando identificación...');
      return;
    }

    setIsValidating(true);
    setAiMessage('IA: Analizando...');

    const result = validateUsernameLocal(value, allUsers.filter(u => u.activo).map(u => ({ username: u.username })));

    if (result.match === 'exact') {
      const user = allUsers.find(u => u.username.toLowerCase() === result.matchedUser?.toLowerCase());
      if (user) {
        setMatchedUser(user);
        setStep('pin');
        setAiMessage('IA: Usuario reconocido. Por favor ingrese su PIN.');
      }
    } else if (result.match === 'similar') {
      setSimilarUser(result.matchedUser);
      setShowSupportBtn(true);
      setAiMessage(result.suggestion);
    } else {
      setAiMessage('IA: Usuario no encontrado en el sistema.');
      setShowSupportBtn(true);
    }

    setIsValidating(false);
  };

  const validatePIN = async (value: string) => {
    setPin(value);

    if (value.length === 4 && matchedUser) {
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
        {/* Avatar Box */}
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border bg-background">
          {step === 'username' ? (
            <Bot className="h-16 w-16 text-primary" />
          ) : (
            <User className="h-16 w-16 text-primary" />
          )}
        </div>

        {/* Form Section */}
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-bold tracking-wide text-primary">
            SYSTEM JABM
          </h2>

          {/* AI Message */}
          <div className="flex min-h-12 items-center rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  placeholder="PIN (4 dígitos)"
                  value={pin}
                  onChange={(e) => validatePIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
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
