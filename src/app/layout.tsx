import type { Metadata } from 'next'
import './globals.css'
import { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { type Locale } from '@/i18n/translations'
import { LanguageProvider } from '@/contexts/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import FloatingTopBar from '@/components/FloatingTopBar'

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: 'Swimmers | Deep Water Performance',
  description: 'AI-powered tracking for swimmers.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value ?? 'pt-BR') as Locale

  return (
    <html lang={locale}>
      <body suppressHydrationWarning className="relative font-sans bg-[#0A0F1D] text-white min-h-screen flex flex-col">
        <LanguageProvider initialLocale={locale}>
          <FloatingTopBar>
            <LanguageToggle />
          </FloatingTopBar>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

