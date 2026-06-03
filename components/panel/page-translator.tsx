'use client';

import { Languages } from 'lucide-react';
import { useLang } from '@/lib/lang-context';

export function PageTranslator() {
  const { lang, toggleLang, t } = useLang();

  return (
    <button
      onClick={toggleLang}
      className={`fixed top-20 right-4 z-[70] w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95 ${
        lang === 'en'
          ? 'bg-emerald-600/40 border border-emerald-500/60 text-emerald-300'
          : 'bg-[#1c2128] border border-[#30363d] text-gray-400 hover:text-cyan-400'
      }`}
      title={t('lang.translate_to') + ' ' + (lang === 'es' ? t('lang.english') : t('lang.spanish'))}
    >
      <Languages className="w-5 h-5" />
    </button>
  );
}
