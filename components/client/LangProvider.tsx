'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { translations, Lang, T } from '@/lib/i18n'

interface LangContextValue {
  lang: Lang
  t: T
  toggleLang: () => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr')
  const toggleLang = () => setLang((l) => (l === 'fr' ? 'en' : 'fr'))
  const t: T = translations[lang] as T
  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be inside <LangProvider>')
  return ctx
}
