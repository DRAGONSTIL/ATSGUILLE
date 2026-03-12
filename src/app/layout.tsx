import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/auth/session-provider'
import { ThemeProvider } from 'next-themes'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import QueryProvider from '@/components/layout/query-provider'

export const metadata: Metadata = {
  title: 'ATLAS GSE - Sistema de Gestión de Reclutamiento',
  description: 'Sistema de seguimiento de candidatos multi-empresa con Kanban, métricas y sincronización con Google Sheets',
  keywords: ['ATS', 'reclutamiento', 'candidatos', 'RRHH', 'gestión'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased text-foreground bg-background">
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
