import type { ReactNode } from 'react'
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
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <ImmersiveAtlasBackground />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(5,7,11,0.08),rgba(5,7,11,0.78)_55%,#05070b_100%)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-4">
          <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/[0.04] shadow-[0_0_32px_rgba(246,201,104,0.14)] backdrop-blur-2xl">
            <Cpu className="h-5 w-5 text-[#f6c968]" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.45em] text-white/45">ATLAS GSE</p>
            <p className="text-sm tracking-[0.18em] text-[#d8b263]">High Signal Talent System</p>
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-right shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <p className="text-[10px] uppercase tracking-[0.38em] text-white/35">Credits</p>
          <p className="text-sm text-white/90">Guillermo Elizalde</p>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] max-w-[1600px] grid-cols-1 gap-12 px-6 pb-8 pt-4 sm:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-16 lg:pb-14 lg:pt-8">
        <section className="flex flex-col justify-between gap-10">
          <div className="max-w-[760px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-white/55 shadow-[0_14px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <Binary className="h-3.5 w-3.5 text-[#f6c968]" />
              {eyebrow}
            </div>

            <h1 className="mt-8 max-w-[12ch] text-5xl font-semibold leading-[0.88] tracking-[-0.06em] text-white sm:text-6xl xl:text-[6.5rem]">
              {title}
            </h1>

            <p className="mt-7 max-w-[58ch] text-base leading-8 text-slate-300 sm:text-lg">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.26em] text-white/42">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">Immersive ATS surface</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">Invite-only access</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">Mouse-reactive signal field</span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.34em] text-white/38">Talent command</p>
                  <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-white sm:text-3xl">
                    Designed to feel discreet, premium, and in control.
                  </h2>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/[0.05] p-3 text-white/70 backdrop-blur-xl sm:flex">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-[#f4dd9c] sm:text-4xl">{metric.value}</p>
                    <p className="mt-2 max-w-[16ch] text-sm leading-6 text-white/58">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,13,22,0.88),rgba(7,10,18,0.96))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/38">Live interaction</p>
              <p className="mt-4 text-xl font-medium tracking-[-0.03em] text-white">
                Move your cursor and the signal field responds like a living infrastructure layer.
              </p>
              <div className="mt-8 space-y-4">
                <div className="rounded-[1.4rem] border border-[#f6c968]/20 bg-[#f6c968]/8 p-4">
                  <div className="flex items-center gap-3">
                    <BriefcaseBusiness className="h-4 w-4 text-[#f6c968]" />
                    <p className="text-sm text-white/90">Executive ATS narrative</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/56">
                    A calmer first impression for recruiters, operations, and leadership.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-[#83b6ff]" />
                    <p className="text-sm text-white/90">Fast trust-building entry</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/56">
                    The visual system stays immersive while the access flow remains obvious and low-friction.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-t border-white/8 pt-8 md:grid-cols-3">
            {experienceCards.map(({ eyebrow: itemEyebrow, title: itemTitle, description: itemDescription }) => (
              <article key={itemTitle} className="border-l border-white/10 pl-5">
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/34">{itemEyebrow}</p>
                <h3 className="mt-4 max-w-[18ch] text-xl font-medium tracking-[-0.03em] text-white">{itemTitle}</h3>
                <p className="mt-3 max-w-[34ch] text-sm leading-7 text-white/56">{itemDescription}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <div
            className={cn(
              'relative w-full max-w-[580px] overflow-hidden rounded-[2.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,16,25,0.82),rgba(7,10,17,0.96))] p-6 shadow-[0_36px_120px_rgba(0,0,0,0.44)] backdrop-blur-[28px] sm:p-8',
              className
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6c968]/70 to-transparent" />
            <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-[#f6c968]/8 blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-[radial-gradient(circle_at_bottom,rgba(100,168,255,0.16),transparent_58%)]" />

            <div className="relative">
              <div className="mb-8 border-b border-white/8 pb-7">
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/38">Access gateway</p>
                <h2 className="mt-3 max-w-[14ch] text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.2rem]">
                  {panelTitle}
                </h2>
                <p className="mt-4 max-w-[44ch] text-sm leading-7 text-white/56">{panelDescription}</p>
              </div>

              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
