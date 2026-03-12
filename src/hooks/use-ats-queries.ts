'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCandidatesQuery(params: { page?: number; limit?: number; search?: string } = {}) {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('limit', String(params.limit ?? 25))
  if (params.search) search.set('search', params.search)

  return useQuery({
    queryKey: ['candidatos', search.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/candidatos?${search.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('No fue posible cargar candidatos')
      return res.json()
    },
  })
}

export function useVacantesQuery(params: { page?: number; limit?: number } = {}) {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 1))
  search.set('limit', String(params.limit ?? 20))

  return useQuery({
    queryKey: ['vacantes', search.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/vacantes?${search.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('No fue posible cargar vacantes')
      return res.json()
    },
  })
}

export function useUpdateCandidateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/candidatos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No fue posible actualizar el candidato')
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
      await queryClient.invalidateQueries({ queryKey: ['actividades'] })
    },
  })
}

export function useDeleteCandidateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/candidatos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No fue posible eliminar el candidato')
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
      await queryClient.invalidateQueries({ queryKey: ['actividades'] })
    },
  })
}

export function useBulkCandidatesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { ids: string[]; action: string; [k: string]: unknown }) => {
      const res = await fetch('/api/candidatos/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No fue posible ejecutar acción masiva')
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
    },
  })
}
