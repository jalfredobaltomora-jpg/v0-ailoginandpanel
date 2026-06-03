'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Lang } from './lang-dict';
import { t as translate } from './lang-dict';
import type { DictKey } from './lang-dict';

interface LangContextProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: DictKey) => string;
}

const LangContext = createContext<LangContextProps>({
  lang: 'es',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: DictKey) => key,
});

export function useLang() {
  return useContext(LangContext);
}

export { translate as td };

const LS_KEY = 'jab-ai-lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === 'en' || saved === 'es') {
        setLangState(saved);
      }
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(LS_KEY, lang); } catch {}
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.dispatchEvent(new CustomEvent('jab-lang', { detail: l })); } catch {}
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'es' ? 'en' : 'es';
      try { window.dispatchEvent(new CustomEvent('jab-lang', { detail: next })); } catch {}
      return next;
    });
  }, []);

  const tFn = useCallback((key: DictKey): string => {
    return translate(key, lang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t: tFn }}>
      {children}
    </LangContext.Provider>
  );
}
