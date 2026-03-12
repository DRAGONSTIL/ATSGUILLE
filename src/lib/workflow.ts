export const TAREA_ESTATUS = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'] as const
export type TareaEstatus = (typeof TAREA_ESTATUS)[number]

const TASK_TRANSITIONS: Record<TareaEstatus, TareaEstatus[]> = {
  PENDIENTE: ['EN_PROGRESO', 'COMPLETADA', 'CANCELADA'],
  EN_PROGRESO: ['PENDIENTE', 'COMPLETADA', 'CANCELADA'],
  COMPLETADA: ['EN_PROGRESO', 'PENDIENTE'],
  CANCELADA: ['PENDIENTE'],
}

export function isValidTaskTransition(from: string, to: string): boolean {
  if (from === to) return true
  if (!TAREA_ESTATUS.includes(from as TareaEstatus) || !TAREA_ESTATUS.includes(to as TareaEstatus)) return false
  return TASK_TRANSITIONS[from as TareaEstatus].includes(to as TareaEstatus)
}

export function deriveMetaStatus(meta: {
  valor: number
  valorActual: number
  fechaInicio: Date
  fechaFin: Date
}): 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'EXCEDIDA' | 'VENCIDA' {
  const now = new Date()
  if (meta.valorActual > meta.valor) return 'EXCEDIDA'
  if (meta.valorActual === meta.valor) return 'COMPLETADA'
  if (now > new Date(meta.fechaFin)) return 'VENCIDA'
  if (now < new Date(meta.fechaInicio) && meta.valorActual <= 0) return 'PENDIENTE'
  return 'EN_PROGRESO'
}
