import type { ReactNode } from 'react'
import { Cormorant_Garamond } from 'next/font/google'
import {
  ArrowUpRight,
  Binary,
  BriefcaseBusiness,
  Clock3,
  Cpu,
  ShieldCheck,
  Sparkles,
  Waypoints,
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

const experienceCards = [
  {
    eyebrow: 'Signal fabric',
    title: 'Candidate flow with executive clarity',
    description: 'See hiring momentum, bottlenecks, and recruiter response time inside one high-trust control surface.',
    icon: Waypoints,
  },
  {
    eyebrow: 'Private by default',
    title: 'Invite-only identity and operational security',
    description: 'Atlas protects each company workspace with segmented access, governed onboarding, and auditable entry.',
    icon: ShieldCheck,
  },
  {
    eyebrow: 'Luxury operations',
    title: 'A premium ATS made to feel calm under pressure',
    description: 'Less dashboard noise, more precision. Every interaction is designed to feel deliberate, fast, and elevated.',
    icon: Sparkles,
  },
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
    <div className={cn('relative min-h-screen overflow-hidden bg-[#05070b] text-white', cormorant.variable)}>
      <ImmersiveAtlasBackground />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(5,7,11,0.08),rgba(5,7,11,0.78)_55%,#05070b_100%)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1520px] items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
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

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-84px)] max-w-[1520px] grid-cols-1 gap-8 px-5 pb-6 pt-1 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:pb-10 lg:pt-4">
        <section className="flex flex-col justify-between gap-7">
          <div className="max-w-[660px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[10px] uppercase tracking-[0.32em] text-white/55 shadow-[0_14px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <Binary className="h-3.5 w-3.5 text-[#f6c968]" />
              {eyebrow}
            </div>

            <h1 className="mt-5 max-w-[11ch] text-[clamp(3.15rem,6vw,5.35rem)] font-semibold leading-[0.88] tracking-[-0.05em] text-white [text-wrap:balance] font-[family:var(--font-auth-display)]">
              {title}
            </h1>

            <p className="mt-4 max-w-[56ch] text-[15px] leading-7 text-slate-300 sm:text-[17px]">
              {description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-white/42 sm:text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-xl">Immersive ATS surface</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-xl">Invite-only access</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-xl">Mouse-reactive field</span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[32rem]">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/38">Talent command</p>
                  <h2 className="mt-2 font-[family:var(--font-auth-display)] text-[clamp(2rem,3vw,2.85rem)] leading-[0.95] tracking-[-0.03em] text-white [text-wrap:balance]">
                    Quiet luxury for recruiting operations.
                  </h2>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/[0.05] p-2.5 text-white/70 backdrop-blur-xl sm:flex">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.4rem] border border-white/8 bg-black/20 px-4 py-4">
                    <p className="font-[family:var(--font-auth-display)] text-[2rem] leading-none tracking-[-0.04em] text-[#f4dd9c] sm:text-[2.4rem]">
                      {metric.value}
                    </p>
                    <p className="mt-2 max-w-[14ch] text-[12px] leading-5 text-white/58 sm:text-[13px]">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,13,22,0.88),rgba(7,10,18,0.96))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/38">Live interaction</p>
              <p className="mt-3 font-[family:var(--font-auth-display)] text-[1.9rem] leading-[0.96] tracking-[-0.03em] text-white">
                Move your cursor and the signal field responds like a living infrastructure layer.
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-[1.25rem] border border-[#f6c968]/20 bg-[#f6c968]/8 p-4">
                  <div className="flex items-center gap-3">
                    <BriefcaseBusiness className="h-4 w-4 text-[#f6c968]" />
                    <p className="text-[13px] text-white/90">Executive ATS narrative</p>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-white/56">
                    A calmer first impression for recruiters, operations, and leadership.
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-[#83b6ff]" />
                    <p className="text-[13px] text-white/90">Fast trust-building entry</p>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-white/56">
                    The visual system stays immersive while the access flow remains obvious and low-friction.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 border-t border-white/8 pt-6 md:grid-cols-3">
            {experienceCards.map(({ eyebrow: itemEyebrow, title: itemTitle, description: itemDescription }) => (
              <article key={itemTitle} className="border-l border-white/10 pl-4">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/34">{itemEyebrow}</p>
                <h3 className="mt-3 max-w-[16ch] font-[family:var(--font-auth-display)] text-[1.65rem] leading-[0.96] tracking-[-0.03em] text-white">
                  {itemTitle}
                </h3>
                <p className="mt-2 max-w-[31ch] text-[13px] leading-6 text-white/56">{itemDescription}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <div
            className={cn(
              'relative w-full max-w-[540px] overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,16,25,0.82),rgba(7,10,17,0.96))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.44)] backdrop-blur-[28px] sm:p-6',
              className
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6c968]/70 to-transparent" />
            <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-[#f6c968]/8 blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-[radial-gradient(circle_at_bottom,rgba(100,168,255,0.16),transparent_58%)]" />

            <div className="relative">
              <div className="mb-6 border-b border-white/8 pb-5">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/38">Access gateway</p>
                <h2 className="mt-2 max-w-[13ch] font-[family:var(--font-auth-display)] text-[clamp(2.1rem,4vw,3rem)] leading-[0.92] tracking-[-0.04em] text-white">
                  {panelTitle}
                </h2>
                <p className="mt-3 max-w-[40ch] text-[13px] leading-6 text-white/56 sm:text-sm">{panelDescription}</p>
              </div>

              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
