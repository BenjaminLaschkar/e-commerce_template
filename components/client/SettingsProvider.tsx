'use client'

import { createContext, useContext } from 'react'

export interface PublicSettings {
  storeName: string
  logoUrl: string | null
  announceBannerFr: string | null
  announceBannerEn: string | null
  checkoutDistractionFree: boolean
  freeShippingThreshold: number
}

const defaultSettings: PublicSettings = {
  storeName: 'Boutique',
  logoUrl: null,
  announceBannerFr: null,
  announceBannerEn: null,
  checkoutDistractionFree: false,
  freeShippingThreshold: 0,
}

const SettingsContext = createContext<PublicSettings>(defaultSettings)

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({
  children,
  settings,
}: {
  children: React.ReactNode
  settings: PublicSettings
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}
