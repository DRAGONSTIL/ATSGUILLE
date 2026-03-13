import type { ReactNode } from 'react'
import { Cormorant_Garamond } from 'next/font/google'
import {
  Binary,
  Cpu,
  ShieldCheck,
} from 'lucide-react'
import { ImmersiveAtlasBackground } from '@/components/auth/immersive-atlas-background'
import { cn } from '@/lib/utils'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-auth-display',
})

const metrics = [
  { value: '32%', label: 'faster shortlist velocity' },
  { value: '4.8x', label: 'clearer recruiter signal' },
  { value: '99.9%', label: 'tenant-isolated access control' },
]

export function AtlasAuthShell({
  eyebrow,
  title,
  description,
  children,
  panelTitle,
  panelDescription,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  panelTitle: string
  panelDescription: string
  className?: string
}) {
  return (
    <div className={cn('relative min-h-dvh overflow-hidden bg-[#05070b] text-white', cormorant.variable)}>
      <ImmersiveAtlasBackground />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(5,7,11,0.08),rgba(5,7,11,0.78)_55%,#05070b_100%)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1460px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.04] shadow-[0_0_32px_rgba(246,201,104,0.14)] backdrop-blur-2xl">
            <Cpu className="h-5 w-5 text-[#f6c968]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.42em] text-white/45">ATLAS GSE</p>
            <p className="text-xs tracking-[0.22em] text-[#d8b263] sm:text-[13px]">High Signal Talent System</p>
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-right shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-4">
          <p className="text-[9px] uppercase tracking-[0.34em] text-white/35">Credits</p>
          <p className="font-[family:var(--font-auth-display)] text-lg leading-none text-white/90 sm:text-[1.15rem]">Guillermo Elizalde</p>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-76px)] max-w-[1460px] grid-cols-1 gap-6 px-5 pb-5 pt-0 sm:px-8 lg:grid-cols-[0.95fr_0.9fr] lg:px-10 lg:pb-8">
        <section className="flex items-center">
          <div className="w-full max-w-[620px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[10px] uppercase tracking-[0.32em] text-white/55 shadow-[0_14px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <Binary className="h-3.5 w-3.5 text-[#f6c968]" />
              {eyebrow}
            </div>

            <h1 className="mt-5 max-w-[10ch] text-[clamp(2.9rem,5.3vw,4.95rem)] font-semibold leading-[0.88] tracking-[-0.045em] text-white [text-wrap:balance] font-[family:var(--font-auth-display)]">
              {title}
            </h1>

            <p className="mt-4 max-w-[50ch] text-[15px] leading-7 text-slate-300 sm:text-[16px]">
              {description}
            </p>

            <div className="mt-6 rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f6c968]/20 bg-[#f6c968]/10">
                  <ShieldCheck className="h-4 w-4 text-[#f6c968]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/36">Executive ATS surface</p>
                  <p className="mt-2 max-w-[42ch] font-[family:var(--font-auth-display)] text-[1.7rem] leading-[0.98] tracking-[-0.03em] text-white">
                    Luxury signal, controlled access, and a calmer first impression.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.15rem] border border-white/8 bg-black/20 px-3 py-3">
                    <p className="truncate font-[family:var(--font-auth-display)] text-[1.9rem] leading-none tracking-[-0.04em] text-[#f4dd9c] sm:text-[2.15rem]">
                      {metric.value}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-5 text-white/56 sm:text-[12px]">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <div
            className={cn(
              'relative w-full max-w-[510px] overflow-hidden rounded-[1.9rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,16,25,0.82),rgba(7,10,17,0.96))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.44)] backdrop-blur-[28px] sm:p-6',
              className
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6c968]/70 to-transparent" />
            <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-[#f6c968]/8 blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-[radial-gradient(circle_at_bottom,rgba(100,168,255,0.16),transparent_58%)]" />

            <div className="relative">
              <div className="mb-5 border-b border-white/8 pb-4">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/38">Access gateway</p>
                <h2 className="mt-2 max-w-[12ch] font-[family:var(--font-auth-display)] text-[clamp(1.95rem,3.2vw,2.8rem)] leading-[0.92] tracking-[-0.04em] text-white">
                  {panelTitle}
                </h2>
                <p className="mt-3 max-w-[38ch] text-[13px] leading-6 text-white/56">{panelDescription}</p>
              </div>

              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
