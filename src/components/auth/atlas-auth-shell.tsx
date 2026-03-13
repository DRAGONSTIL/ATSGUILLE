import type { ReactNode } from 'react'
import { Activity, ArrowUpRight, Building2, Cpu, ShieldCheck, Sparkles, Waves, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const highlights: Array<{ title: string; description: string; icon: LucideIcon }> = [
  { title: 'Pipeline inteligente', description: 'orquestación precisa por etapa crítica', icon: Activity },
  { title: 'Analítica en tiempo real', description: 'lectura ejecutiva de demanda y conversión', icon: ArrowUpRight },
  { title: 'Multiempresa', description: 'aislamiento seguro por tenant corporativo', icon: Building2 },
  { title: 'Colaboración sincronizada', description: 'operación distribuida con control unificado', icon: Waves },
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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(28,64,140,0.28),_transparent_28%),radial-gradient(circle_at_20%_20%,_rgba(243,186,47,0.14),_transparent_22%),linear-gradient(180deg,_#06070b_0%,_#090d14_42%,_#05060a_100%)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[14%] h-72 w-72 rounded-full bg-amber-400/10 blur-3xl animate-pulse" />
        <div className="absolute right-[10%] top-[22%] h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-[8%] left-[18%] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
        {Array.from({ length: 28 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-1 w-1 rounded-full bg-white/60"
            style={{
              left: `${(index * 13) % 100}%`,
              top: `${(index * 29) % 100}%`,
              opacity: 0.25 + (index % 5) * 0.08,
              boxShadow: index % 3 === 0 ? '0 0 18px rgba(243,186,47,0.42)' : '0 0 14px rgba(120,170,255,0.28)',
              animation: `float ${4 + (index % 4)}s ease-in-out ${index * 0.12}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-amber-300/20 bg-white/5 shadow-[0_0_40px_rgba(243,186,47,0.18)] backdrop-blur-xl">
              <Cpu className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-sm tracking-[0.35em] text-white/40 uppercase">ATLAS GSE</p>
              <p className="text-xs tracking-[0.25em] text-amber-300/80 uppercase">Secure Talent Command</p>
            </div>
          </div>

          <div className="max-w-2xl py-12 lg:py-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-white/60 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {eyebrow}
            </div>
            <h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-6xl xl:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              {description}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {highlights.map(({ title: cardTitle, description: cardDescription, icon: Icon }, index) => (
                <div
                  key={cardTitle}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-amber-300/25"
                  style={{ animation: `fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) ${0.12 * index}s both` }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(243,186,47,0.18),_transparent_36%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
                      <Icon className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{cardTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{cardDescription}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 inline-flex max-w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/40">Firma de autor</p>
              <p className="text-sm text-slate-200">Diseñado y creado por Guillermo Elizalde</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div
            className={cn(
              'relative w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.88),rgba(8,10,16,0.94))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:p-8',
              className
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
            <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-amber-300/10 blur-2xl" />
            <div className="absolute bottom-8 left-8 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
            <div className="relative">
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.32em] text-white/40">Access Gateway</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{panelTitle}</h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">{panelDescription}</p>
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
