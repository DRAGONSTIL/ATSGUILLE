import { NextRequest, NextResponse } from 'next/server'
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { z } from 'zod'
import { requireRole, requireSession, safeErrorResponse, type SessionUser } from '@/lib/api-security'
import { db } from '@/lib/db'

const DashboardAnalyticsQuerySchema = z.object({
  preset: z.enum(['day', 'week', 'month', 'year', 'custom']).default('month'),
  from: z.string().optional(),
  to: z.string().optional(),
  recruiterId: z.string().optional(),
  teamId: z.string().optional(),
  branch: z.string().optional(),
})

type DateRange = {
  from: Date
  to: Date
  previousFrom: Date
  previousTo: Date
  label: string
  granularity: 'day' | 'week' | 'month'
}

function resolveDateRange(input: z.infer<typeof DashboardAnalyticsQuerySchema>): DateRange {
  const now = new Date()

  let from = startOfMonth(now)
  let to = endOfDay(now)

  if (input.preset === 'day') {
    from = startOfDay(now)
    to = endOfDay(now)
  } else if (input.preset === 'week') {
    from = startOfWeek(now, { weekStartsOn: 1 })
    to = endOfWeek(now, { weekStartsOn: 1 })
  } else if (input.preset === 'month') {
    from = startOfMonth(now)
    to = endOfMonth(now)
  } else if (input.preset === 'year') {
    from = startOfYear(now)
    to = endOfYear(now)
  } else if (input.preset === 'custom' && input.from && input.to) {
    from = startOfDay(new Date(input.from))
    to = endOfDay(new Date(input.to))
  }

  const safeFrom = from <= to ? from : startOfDay(new Date(input.to || now))
  const safeTo = from <= to ? to : endOfDay(new Date(input.from || now))
  const rangeLength = Math.max(1, differenceInCalendarDays(safeTo, safeFrom) + 1)
  const previousTo = endOfDay(subDays(safeFrom, 1))
  const previousFrom = startOfDay(subDays(safeFrom, rangeLength))

  let granularity: 'day' | 'week' | 'month' = 'day'
  if (rangeLength > 120) {
    granularity = 'month'
  } else if (rangeLength > 45) {
    granularity = 'week'
  }

  return {
    from: safeFrom,
    to: safeTo,
    previousFrom,
    previousTo,
    label: `${format(safeFrom, "d MMM yyyy", { locale: es })} - ${format(safeTo, "d MMM yyyy", { locale: es })}`,
    granularity,
  }
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }

  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function avg(values: number[]) {
  if (values.length === 0) {
    return null
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

function diffDaysSafe(later: Date | null | undefined, earlier: Date | null | undefined) {
  if (!later || !earlier) {
    return null
  }

  return Math.max(0, differenceInCalendarDays(later, earlier))
}

function normalizeInterviewStage(tipo: string | null | undefined) {
  const normalized = (tipo || '').toUpperCase()

  if (normalized.includes('TELEF')) {
    return 'PHONE'
  }

  if (normalized.includes('PRESENC')) {
    return 'ONSITE'
  }

  if (normalized.includes('VIDEO') || normalized.includes('TECN')) {
    return 'INTERVIEW'
  }

  return 'INTERVIEW'
}

function groupKeyForDate(date: Date, granularity: 'day' | 'week' | 'month') {
  if (granularity === 'month') {
    return format(startOfMonth(date), 'yyyy-MM-01')
  }

  if (granularity === 'week') {
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }

  return format(startOfDay(date), 'yyyy-MM-dd')
}

function bucketLabel(date: Date, granularity: 'day' | 'week' | 'month') {
  if (granularity === 'month') {
    return format(date, 'MMM yy', { locale: es })
  }

  if (granularity === 'week') {
    return `Sem ${format(date, 'd MMM', { locale: es })}`
  }

  return format(date, 'd MMM', { locale: es })
}

function buildBuckets(range: DateRange) {
  const dates = range.granularity === 'month'
    ? eachMonthOfInterval({ start: range.from, end: range.to })
    : range.granularity === 'week'
      ? eachWeekOfInterval({ start: range.from, end: range.to }, { weekStartsOn: 1 })
      : eachDayOfInterval({ start: range.from, end: range.to })

  return dates.map((date) => ({
    key: groupKeyForDate(date, range.granularity),
    label: bucketLabel(date, range.granularity),
  }))
}

function inRange(date: Date | null | undefined, range: Pick<DateRange, 'from' | 'to'>) {
  if (!date) {
    return false
  }

  return date >= range.from && date <= range.to
}

function buildTenantWhere(user: SessionUser) {
  if (user.rol === 'ADMIN' && !user.empresaId) {
    return {}
  }

  return { empresaId: user.empresaId ?? undefined }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession()
    requireRole(user, ['ADMIN', 'GERENTE', 'RECLUTADOR'])

    const { searchParams } = new URL(request.url)
    const query = DashboardAnalyticsQuerySchema.parse({
      preset: searchParams.get('preset') || 'month',
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      recruiterId: searchParams.get('recruiterId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      branch: searchParams.get('branch') || undefined,
    })

    const range = resolveDateRange(query)
    const tenantWhere = buildTenantWhere(user)

    const [filterUsers, filterTeams, filterVacancies] = await Promise.all([
      db.user.findMany({
        where: {
          ...tenantWhere,
          activo: true,
          ...(user.rol === 'RECLUTADOR' ? { id: user.id } : {}),
        },
        select: { id: true, name: true, rol: true },
        orderBy: { name: 'asc' },
      }),
      db.equipo.findMany({
        where: {
          ...tenantWhere,
          activo: true,
        },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      db.vacante.findMany({
        where: {
          ...tenantWhere,
          ubicacion: { not: null },
        },
        select: { ubicacion: true },
        distinct: ['ubicacion'],
        orderBy: { ubicacion: 'asc' },
      }),
    ])

    const recruiterId = user.rol === 'RECLUTADOR' ? user.id : query.recruiterId
    const teamId = query.teamId
    const branch = query.branch

    if (recruiterId && !filterUsers.some((option) => option.id === recruiterId)) {
      return NextResponse.json({ error: 'Reclutador fuera del alcance autorizado' }, { status: 403 })
    }

    if (teamId && !filterTeams.some((option) => option.id === teamId)) {
      return NextResponse.json({ error: 'Equipo fuera del alcance autorizado' }, { status: 403 })
    }

    const vacancyScopeWhere: Record<string, unknown> = {
      ...tenantWhere,
    }

    if (recruiterId) {
      vacancyScopeWhere.reclutadorId = recruiterId
    }

    if (teamId) {
      vacancyScopeWhere.equipoId = teamId
    }

    if (branch) {
      vacancyScopeWhere.ubicacion = branch
    }

    const candidateScopeWhere: Record<string, unknown> = {
      ...(user.rol === 'ADMIN' && !user.empresaId ? {} : { equipo: { empresaId: user.empresaId } }),
    }

    if (recruiterId) {
      candidateScopeWhere.reclutadorId = recruiterId
    }

    if (teamId) {
      candidateScopeWhere.equipoId = teamId
    }

    if (branch) {
      candidateScopeWhere.vacante = { ubicacion: branch }
    }

    const interviewCandidateScope: Record<string, unknown> =
      user.rol === 'ADMIN' && !user.empresaId ? {} : { equipo: { empresaId: user.empresaId } }

    if (recruiterId) {
      interviewCandidateScope.reclutadorId = recruiterId
    }

    if (teamId) {
      interviewCandidateScope.equipoId = teamId
    }

    const interviewScopeWhere: Record<string, unknown> = {
      fecha: {
        lte: range.to,
      },
      candidato: interviewCandidateScope,
    }

    if (branch) {
      interviewScopeWhere.vacante = { ubicacion: branch }
    }

    const recentActivityWhere: Record<string, unknown> = {
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
    }

    if (user.rol !== 'ADMIN' || user.empresaId) {
      recentActivityWhere.usuario = { empresaId: user.empresaId }
    }

    if (recruiterId) {
      recentActivityWhere.usuarioId = recruiterId
    }

    const [candidates, vacancies, interviews, recentActivity] = await Promise.all([
      db.candidato.findMany({
        where: candidateScopeWhere,
        select: {
          id: true,
          nombre: true,
          apellido: true,
          createdAt: true,
          estatus: true,
          fuente: true,
          rating: true,
          fechaOferta: true,
          fechaContratacion: true,
          fechaRechazo: true,
          motivoRechazo: true,
          vacanteId: true,
          reclutadorId: true,
          equipoId: true,
          reclutador: { select: { id: true, name: true } },
          equipo: { select: { id: true, nombre: true } },
          vacante: {
            select: {
              id: true,
              titulo: true,
              ubicacion: true,
              vacantes: true,
              vacantesLlenas: true,
              estatus: true,
            },
          },
        },
      }),
      db.vacante.findMany({
        where: vacancyScopeWhere,
        select: {
          id: true,
          titulo: true,
          ubicacion: true,
          estatus: true,
          vacantes: true,
          vacantesLlenas: true,
          createdAt: true,
          fechaPublicacion: true,
          reclutadorId: true,
          equipoId: true,
          reclutador: { select: { id: true, name: true } },
          metricas: {
            where: {
              createdAt: {
                lte: range.to,
              },
            },
            select: {
              costoContratacion: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 12,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.entrevista.findMany({
        where: interviewScopeWhere,
        select: {
          id: true,
          fecha: true,
          tipo: true,
          estatus: true,
          candidatoId: true,
          vacanteId: true,
          candidato: {
            select: {
              reclutadorId: true,
              equipoId: true,
            },
          },
        },
      }),
      db.actividad.findMany({
        where: recentActivityWhere,
        include: {
          usuario: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

    const previousRange = { from: range.previousFrom, to: range.previousTo }
    const currentCandidates = candidates.filter((candidate) => inRange(candidate.createdAt, range))
    const previousCandidates = candidates.filter((candidate) => inRange(candidate.createdAt, previousRange))
    const currentHires = candidates.filter((candidate) => inRange(candidate.fechaContratacion, range))
    const previousHires = candidates.filter((candidate) => inRange(candidate.fechaContratacion, previousRange))
    const currentOffers = candidates.filter((candidate) => inRange(candidate.fechaOferta, range))
    const previousOffers = candidates.filter((candidate) => inRange(candidate.fechaOferta, previousRange))
    const currentRejections = candidates.filter((candidate) => inRange(candidate.fechaRechazo, range))
    const currentInterviews = interviews.filter((interview) => inRange(interview.fecha, range))
    const previousInterviews = interviews.filter((interview) => inRange(interview.fecha, previousRange))
    const currentInterviewCompletions = currentInterviews.filter((interview) => interview.estatus === 'REALIZADA')
    const previousInterviewCompletions = previousInterviews.filter((interview) => interview.estatus === 'REALIZADA')

    const currentTimeToHire = currentHires
      .map((candidate) => candidate.fechaContratacion ? differenceInCalendarDays(candidate.fechaContratacion, candidate.createdAt) : null)
      .filter((value): value is number => value !== null)

    const previousTimeToHire = previousHires
      .map((candidate) => candidate.fechaContratacion ? differenceInCalendarDays(candidate.fechaContratacion, candidate.createdAt) : null)
      .filter((value): value is number => value !== null)

    const interviewsByCandidate = interviews.reduce<Map<string, Array<(typeof interviews)[number]>>>((accumulator, interview) => {
      const existing = accumulator.get(interview.candidatoId) || []
      existing.push(interview)
      accumulator.set(interview.candidatoId, existing)
      return accumulator
    }, new Map())

    for (const candidateInterviews of interviewsByCandidate.values()) {
      candidateInterviews.sort((left, right) => left.fecha.getTime() - right.fecha.getTime())
    }

    const candidateMilestones = new Map<string, {
      phoneDate: Date | null
      interviewDate: Date | null
      onsiteDate: Date | null
      anyInterviewDate: Date | null
    }>()

    for (const candidate of candidates) {
      const candidateInterviews = interviewsByCandidate.get(candidate.id) || []
      const anyInterview = candidateInterviews[0]?.fecha || null
      const phoneInterview = candidateInterviews.find((interview) => normalizeInterviewStage(interview.tipo) === 'PHONE')?.fecha || null
      const interviewStage = candidateInterviews.find((interview) => normalizeInterviewStage(interview.tipo) === 'INTERVIEW')?.fecha || null
      const onsiteInterview = candidateInterviews.find((interview) => normalizeInterviewStage(interview.tipo) === 'ONSITE')?.fecha || null

      candidateMilestones.set(candidate.id, {
        phoneDate: phoneInterview || anyInterview,
        interviewDate: interviewStage || onsiteInterview || null,
        onsiteDate: onsiteInterview,
        anyInterviewDate: anyInterview,
      })
    }

    const activeCandidates = candidates.filter((candidate) => candidate.estatus !== 'CONTRATADO' && candidate.estatus !== 'RECHAZADO')

    const funnelStages = [
      { key: 'REGISTRADO', label: 'Registrados' },
      { key: 'EN_PROCESO', label: 'En proceso' },
      { key: 'ENTREVISTA', label: 'Entrevista' },
      { key: 'CONTRATADO', label: 'Contratados' },
      { key: 'RECHAZADO', label: 'Rechazados' },
    ]

    const funnel = funnelStages.map((stage) => {
      const count = currentCandidates.filter((candidate) => candidate.estatus === stage.key).length
      return {
        ...stage,
        count,
        share: currentCandidates.length > 0 ? Number(((count / currentCandidates.length) * 100).toFixed(1)) : 0,
      }
    })

    const sourcesMap = new Map<string, { source: string; candidates: number; hires: number }>()
    for (const candidate of currentCandidates) {
      const current = sourcesMap.get(candidate.fuente) ?? { source: candidate.fuente, candidates: 0, hires: 0 }
      current.candidates += 1
      if (candidate.fechaContratacion && inRange(candidate.fechaContratacion, range)) {
        current.hires += 1
      }
      sourcesMap.set(candidate.fuente, current)
    }

    const sourcePerformance = Array.from(sourcesMap.values())
      .map((item) => ({
        ...item,
        conversionRate: item.candidates > 0 ? Number(((item.hires / item.candidates) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.hires - left.hires || right.candidates - left.candidates)

    const recruiterMap = new Map<string, {
      id: string
      name: string
      candidates: number
      hires: number
      interviews: number
      timeToHireSamples: number[]
    }>()

    for (const candidate of currentCandidates) {
      const id = candidate.reclutador?.id || 'unassigned'
      const name = candidate.reclutador?.name || 'Sin asignar'
      const current = recruiterMap.get(id) ?? { id, name, candidates: 0, hires: 0, interviews: 0, timeToHireSamples: [] }
      current.candidates += 1
      if (candidate.fechaContratacion && inRange(candidate.fechaContratacion, range)) {
        current.hires += 1
        current.timeToHireSamples.push(differenceInCalendarDays(candidate.fechaContratacion, candidate.createdAt))
      }
      recruiterMap.set(id, current)
    }

    for (const interview of currentInterviewCompletions) {
      const recruiterKey = interview.candidato?.reclutadorId || 'unassigned'
      const current = recruiterMap.get(recruiterKey)
      if (current) {
        current.interviews += 1
      }
    }

    const recruiterPerformance = Array.from(recruiterMap.values())
      .map((item) => ({
        id: item.id,
        name: item.name,
        candidates: item.candidates,
        hires: item.hires,
        interviews: item.interviews,
        conversionRate: item.candidates > 0 ? Number(((item.hires / item.candidates) * 100).toFixed(1)) : 0,
        avgTimeToHire: avg(item.timeToHireSamples),
      }))
      .sort((left, right) => right.hires - left.hires || right.candidates - left.candidates)

    const teamMap = new Map<string, {
      id: string
      name: string
      candidates: number
      hires: number
      interviews: number
    }>()

    for (const candidate of currentCandidates) {
      const id = candidate.equipo?.id || 'unassigned'
      const name = candidate.equipo?.nombre || 'Sin equipo'
      const current = teamMap.get(id) ?? { id, name, candidates: 0, hires: 0, interviews: 0 }
      current.candidates += 1
      if (candidate.fechaContratacion && inRange(candidate.fechaContratacion, range)) {
        current.hires += 1
      }
      teamMap.set(id, current)
    }

    for (const interview of currentInterviewCompletions) {
      const teamKey = interview.candidato?.equipoId || 'unassigned'
      const current = teamMap.get(teamKey)
      if (current) {
        current.interviews += 1
      }
    }

    const teamPerformance = Array.from(teamMap.values())
      .map((item) => ({
        ...item,
        conversionRate: item.candidates > 0 ? Number(((item.hires / item.candidates) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.hires - left.hires || right.candidates - left.candidates)

    const branchMap = new Map<string, {
      branch: string
      candidates: number
      hires: number
      openPositions: number
    }>()

    for (const vacancy of vacancies) {
      const key = vacancy.ubicacion || 'Sin sucursal'
      const current = branchMap.get(key) ?? { branch: key, candidates: 0, hires: 0, openPositions: 0 }
      if (vacancy.estatus === 'PUBLICADA') {
        current.openPositions += Math.max(0, vacancy.vacantes - vacancy.vacantesLlenas)
      }
      branchMap.set(key, current)
    }

    for (const candidate of currentCandidates) {
      const key = candidate.vacante?.ubicacion || 'Sin sucursal'
      const current = branchMap.get(key) ?? { branch: key, candidates: 0, hires: 0, openPositions: 0 }
      current.candidates += 1
      if (candidate.fechaContratacion && inRange(candidate.fechaContratacion, range)) {
        current.hires += 1
      }
      branchMap.set(key, current)
    }

    const branchPerformance = Array.from(branchMap.values())
      .map((item) => ({
        ...item,
        conversionRate: item.candidates > 0 ? Number(((item.hires / item.candidates) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.hires - left.hires || right.candidates - left.candidates)

    const buckets = buildBuckets(range)
    const trendMap = new Map(
      buckets.map((bucket) => [
        bucket.key,
        {
          key: bucket.key,
          label: bucket.label,
          candidates: 0,
          interviews: 0,
          hires: 0,
          offers: 0,
        },
      ])
    )

    for (const candidate of currentCandidates) {
      const key = groupKeyForDate(candidate.createdAt, range.granularity)
      const bucket = trendMap.get(key)
      if (bucket) {
        bucket.candidates += 1
      }
    }

    for (const candidate of currentHires) {
      const key = groupKeyForDate(candidate.fechaContratacion!, range.granularity)
      const bucket = trendMap.get(key)
      if (bucket) {
        bucket.hires += 1
      }
    }

    for (const candidate of currentOffers) {
      const key = groupKeyForDate(candidate.fechaOferta!, range.granularity)
      const bucket = trendMap.get(key)
      if (bucket) {
        bucket.offers += 1
      }
    }

    for (const interview of currentInterviewCompletions) {
      const key = groupKeyForDate(interview.fecha, range.granularity)
      const bucket = trendMap.get(key)
      if (bucket) {
        bucket.interviews += 1
      }
    }

    const candidatesByVacancy = currentCandidates.reduce<Record<string, number>>((accumulator, candidate) => {
      if (candidate.vacanteId) {
        accumulator[candidate.vacanteId] = (accumulator[candidate.vacanteId] || 0) + 1
      }
      return accumulator
    }, {})

    const hiresByVacancy = currentHires.reduce<Record<string, number>>((accumulator, candidate) => {
      if (candidate.vacanteId) {
        accumulator[candidate.vacanteId] = (accumulator[candidate.vacanteId] || 0) + 1
      }
      return accumulator
    }, {})

    const offersByVacancy = currentOffers.reduce<Record<string, number>>((accumulator, candidate) => {
      if (candidate.vacanteId) {
        accumulator[candidate.vacanteId] = (accumulator[candidate.vacanteId] || 0) + 1
      }
      return accumulator
    }, {})

    const interviewsByVacancy = currentInterviewCompletions.reduce<Record<string, number>>((accumulator, interview) => {
      if (interview.vacanteId) {
        accumulator[interview.vacanteId] = (accumulator[interview.vacanteId] || 0) + 1
      }
      return accumulator
    }, {})

    const vacancyPipeline = vacancies
      .map((vacancy) => ({
        id: vacancy.id,
        title: vacancy.titulo,
        branch: vacancy.ubicacion || 'Sin sucursal',
        recruiter: vacancy.reclutador?.name || 'Sin asignar',
        status: vacancy.estatus,
        openSeats: Math.max(0, vacancy.vacantes - vacancy.vacantesLlenas),
        candidates: candidatesByVacancy[vacancy.id] || 0,
        interviews: interviewsByVacancy[vacancy.id] || 0,
        offers: offersByVacancy[vacancy.id] || 0,
        hires: hiresByVacancy[vacancy.id] || 0,
      }))
      .sort((left, right) => right.hires - left.hires || right.candidates - left.candidates)
      .slice(0, 8)

    const openSeats = vacancies
      .filter((vacancy) => vacancy.estatus === 'PUBLICADA')
      .reduce((sum, vacancy) => sum + Math.max(0, vacancy.vacantes - vacancy.vacantesLlenas), 0)

    const openRoles = vacancies.filter((vacancy) => vacancy.estatus === 'PUBLICADA').length
    const conversionRate = currentCandidates.length > 0 ? Number(((currentHires.length / currentCandidates.length) * 100).toFixed(1)) : 0
    const previousConversionRate = previousCandidates.length > 0 ? Number(((previousHires.length / previousCandidates.length) * 100).toFixed(1)) : 0
    const appsPerHire = currentHires.length > 0 ? Number((currentCandidates.length / currentHires.length).toFixed(1)) : null

    const costPerHireSamples = vacancies
      .filter((vacancy) => (hiresByVacancy[vacancy.id] || 0) > 0)
      .map((vacancy) => vacancy.metricas.find((metric) => metric.costoContratacion !== null)?.costoContratacion ?? null)
      .filter((value): value is number => value !== null)

    const daysInMarketSamples = vacancies
      .filter((vacancy) => vacancy.estatus === 'PUBLICADA')
      .map((vacancy) => diffDaysSafe(range.to, vacancy.fechaPublicacion || vacancy.createdAt))
      .filter((value): value is number => value !== null)

    const funnelReference = [
      {
        key: 'APPLICATION',
        label: 'Application',
        count: currentCandidates.length,
      },
      {
        key: 'PHONE_SCREEN',
        label: 'Phone Screen',
        count: currentCandidates.filter((candidate) => {
          const milestones = candidateMilestones.get(candidate.id)
          return Boolean(milestones?.phoneDate || milestones?.anyInterviewDate)
        }).length,
      },
      {
        key: 'INTERVIEW',
        label: 'MGR Interview',
        count: currentCandidates.filter((candidate) => Boolean(candidateMilestones.get(candidate.id)?.interviewDate)).length,
      },
      {
        key: 'ONSITE',
        label: 'Onsite Interview',
        count: currentCandidates.filter((candidate) => Boolean(candidateMilestones.get(candidate.id)?.onsiteDate)).length,
      },
      {
        key: 'OFFER',
        label: 'Offer',
        count: currentCandidates.filter((candidate) => Boolean(candidate.fechaOferta && candidate.fechaOferta <= range.to)).length,
      },
      {
        key: 'HIRE',
        label: 'Hire',
        count: currentHires.length,
      },
    ].map((stage) => ({
      ...stage,
      share: currentCandidates.length > 0 ? Number(((stage.count / currentCandidates.length) * 100).toFixed(1)) : 0,
    }))

    const monthlyMetrics = eachMonthOfInterval({
      start: startOfMonth(subMonths(range.to, 11)),
      end: startOfMonth(range.to),
    }).map((monthDate) => {
      const monthRange = {
        from: startOfMonth(monthDate),
        to: endOfMonth(monthDate),
      }

      const hires = candidates.filter((candidate) => inRange(candidate.fechaContratacion, monthRange))
      const monthTimeToHire = hires
        .map((candidate) => diffDaysSafe(candidate.fechaContratacion, candidate.createdAt))
        .filter((value): value is number => value !== null)

      return {
        key: format(monthDate, 'yyyy-MM-01'),
        month: format(monthDate, 'MMM yy', { locale: es }),
        hires: hires.length,
        daysToHire: avg(monthTimeToHire),
      }
    })

    const efficiencyBuckets = {
      application: [] as number[],
      phone: [] as number[],
      interview: [] as number[],
      onsite: [] as number[],
      offer: [] as number[],
    }

    for (const candidate of currentHires) {
      const milestones = candidateMilestones.get(candidate.id)
      const startToPhone = diffDaysSafe(milestones?.phoneDate || milestones?.interviewDate || milestones?.onsiteDate || candidate.fechaOferta || candidate.fechaContratacion, candidate.createdAt)
      const phoneToInterview = diffDaysSafe(milestones?.interviewDate || milestones?.onsiteDate || candidate.fechaOferta || candidate.fechaContratacion, milestones?.phoneDate)
      const interviewToOnsite = diffDaysSafe(milestones?.onsiteDate || candidate.fechaOferta || candidate.fechaContratacion, milestones?.interviewDate)
      const onsiteToOffer = diffDaysSafe(candidate.fechaOferta || candidate.fechaContratacion, milestones?.onsiteDate)
      const offerToHire = diffDaysSafe(candidate.fechaContratacion, candidate.fechaOferta)

      if (startToPhone !== null) efficiencyBuckets.application.push(startToPhone)
      if (phoneToInterview !== null) efficiencyBuckets.phone.push(phoneToInterview)
      if (interviewToOnsite !== null) efficiencyBuckets.interview.push(interviewToOnsite)
      if (onsiteToOffer !== null) efficiencyBuckets.onsite.push(onsiteToOffer)
      if (offerToHire !== null) efficiencyBuckets.offer.push(offerToHire)
    }

    const pipelineEfficiency = [
      { key: 'application', label: 'Application', days: avg(efficiencyBuckets.application) ?? 0 },
      { key: 'phone', label: 'Phone Screen', days: avg(efficiencyBuckets.phone) ?? 0 },
      { key: 'interview', label: 'MGR Interview', days: avg(efficiencyBuckets.interview) ?? 0 },
      { key: 'onsite', label: 'Onsite Interview', days: avg(efficiencyBuckets.onsite) ?? 0 },
      { key: 'offer', label: 'Offer', days: avg(efficiencyBuckets.offer) ?? 0 },
    ].filter((stage) => stage.days > 0)

    const declineReasons = Array.from(currentRejections.reduce<Map<string, number>>((accumulator, candidate) => {
      const key = candidate.motivoRechazo?.trim() || 'Sin motivo'
      accumulator.set(key, (accumulator.get(key) || 0) + 1)
      return accumulator
    }, new Map()).entries())
      .map(([reason, count]) => ({
        reason,
        count,
        share: currentRejections.length > 0 ? Number(((count / currentRejections.length) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)

    const applicationSources = Array.from(currentCandidates.reduce<Map<string, { source: string; candidates: number; hires: number }>>((accumulator, candidate) => {
      const key = candidate.fuente
      const current = accumulator.get(key) || { source: key, candidates: 0, hires: 0 }
      current.candidates += 1
      if (candidate.fechaContratacion && inRange(candidate.fechaContratacion, range)) {
        current.hires += 1
      }
      accumulator.set(key, current)
      return accumulator
    }, new Map()).values())
      .map((item) => ({
        source: item.source,
        candidates: item.candidates,
        hires: item.hires,
        shareOfHires: currentHires.length > 0 ? Number(((item.hires / currentHires.length) * 100).toFixed(1)) : 0,
        conversionRate: item.candidates > 0 ? Number(((item.hires / item.candidates) * 100).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.hires - left.hires || right.candidates - left.candidates)
      .slice(0, 5)

    const activePipelineMap = new Map([
      ['APPLICATION', { key: 'APPLICATION', label: 'Application', count: 0, color: '#1565c0' }],
      ['PHONE', { key: 'PHONE', label: 'Phone Screen', count: 0, color: '#00897b' }],
      ['INTERVIEW', { key: 'INTERVIEW', label: 'MGR Interview', count: 0, color: '#7cb342' }],
      ['ONSITE', { key: 'ONSITE', label: 'Onsite Interview', count: 0, color: '#f4a300' }],
      ['OFFER', { key: 'OFFER', label: 'Offer', count: 0, color: '#ef5350' }],
    ])

    for (const candidate of activeCandidates) {
      const milestones = candidateMilestones.get(candidate.id)
      let stageKey = 'APPLICATION'

      if (candidate.fechaOferta && !candidate.fechaContratacion && !candidate.fechaRechazo) {
        stageKey = 'OFFER'
      } else if (milestones?.onsiteDate) {
        stageKey = 'ONSITE'
      } else if (milestones?.interviewDate) {
        stageKey = 'INTERVIEW'
      } else if (milestones?.phoneDate || milestones?.anyInterviewDate) {
        stageKey = 'PHONE'
      }

      const stage = activePipelineMap.get(stageKey)
      if (stage) {
        stage.count += 1
      }
    }

    const activePipeline = Array.from(activePipelineMap.values())

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      range: {
        preset: query.preset,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: range.label,
        granularity: range.granularity,
      },
      appliedFilters: {
        recruiterId: recruiterId || null,
        teamId: teamId || null,
        branch: branch || null,
      },
      filterOptions: {
        recruiters: filterUsers
          .filter((option) => option.rol === 'RECLUTADOR' || option.rol === 'GERENTE')
          .map((option) => ({ id: option.id, name: option.name || 'Sin nombre' })),
        teams: filterTeams.map((option) => ({ id: option.id, name: option.nombre })),
        branches: filterVacancies
          .map((option) => option.ubicacion)
          .filter((value): value is string => Boolean(value))
          .map((value) => ({ value, label: value })),
      },
      summary: {
        pipelineEntries: {
          value: currentCandidates.length,
          previous: previousCandidates.length,
          change: percentChange(currentCandidates.length, previousCandidates.length),
        },
        hires: {
          value: currentHires.length,
          previous: previousHires.length,
          change: percentChange(currentHires.length, previousHires.length),
        },
        interviewsCompleted: {
          value: currentInterviewCompletions.length,
          previous: previousInterviewCompletions.length,
          change: percentChange(currentInterviewCompletions.length, previousInterviewCompletions.length),
        },
        offersSent: {
          value: currentOffers.length,
          previous: previousOffers.length,
          change: percentChange(currentOffers.length, previousOffers.length),
        },
        timeToHireDays: {
          value: avg(currentTimeToHire),
          previous: avg(previousTimeToHire),
          change: percentChange(avg(currentTimeToHire) || 0, avg(previousTimeToHire) || 0),
        },
        openPositions: {
          openRoles,
          openSeats,
        },
        conversionRate: {
          value: conversionRate,
          previous: previousConversionRate,
          change: percentChange(conversionRate, previousConversionRate),
        },
        rejectionRate: {
          value: currentCandidates.length > 0 ? Number(((currentRejections.length / currentCandidates.length) * 100).toFixed(1)) : 0,
        },
        appsPerHire: {
          value: appsPerHire,
        },
        costPerHire: {
          value: avg(costPerHireSamples),
        },
        daysInMarket: {
          value: avg(daysInMarketSamples),
        },
      },
      charts: {
        trend: Array.from(trendMap.values()),
        funnel,
        sourcePerformance,
        recruiterPerformance,
        teamPerformance,
        branchPerformance,
      },
      dashboard: {
        topMetrics: {
          hired: currentHires.length,
          appsPerHire,
          daysToHire: avg(currentTimeToHire),
          costPerHire: avg(costPerHireSamples),
          openPositions: openRoles,
          daysInMarket: avg(daysInMarketSamples),
        },
        recruitmentFunnel: funnelReference,
        monthlyMetrics,
        pipelineEfficiency: {
          totalDays: avg(currentTimeToHire),
          stages: pipelineEfficiency,
        },
        applicationSources,
        declineReasons,
        activePipeline: {
          totalPending: activeCandidates.length,
          stages: activePipeline,
        },
      },
      tables: {
        vacancyPipeline,
      },
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        descripcion: activity.descripcion,
        tipo: activity.tipo,
        createdAt: activity.createdAt,
        usuario: activity.usuario,
      })),
      dataNotes: {
        branchDefinition: 'La sucursal se determina con la ubicacion configurada en cada vacante activa o historica.',
        stageDefinition: 'Las metricas de embudo se calculan sobre la cohorte de candidatos creada dentro del periodo filtrado.',
      },
    })
  } catch (error) {
    return safeErrorResponse(error, request)
  }
}
