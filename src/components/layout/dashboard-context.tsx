'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export const DashboardContext = createContext<any>(null)

// Funciones de fetch puras
const fetchCandidatos = async () => {
    const res = await fetch('/api/candidatos?limit=25')
    if (!res.ok) throw new Error('Error fetching candidatos')
    const data = await res.json()
    return data.candidatos || []
}

const fetchVacantes = async () => {
    const res = await fetch('/api/vacantes?limit=25')
    if (!res.ok) throw new Error('Error fetching vacantes')
    const data = await res.json()
    return data.vacantes || []
}

const fetchActividades = async () => {
    const res = await fetch('/api/actividades?limit=10')
    if (!res.ok) throw new Error('Error fetching actividades')
    const data = await res.json()
    return data.actividades || []
}

export function DashboardProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession()
    const queryClient = useQueryClient()

    // Query de Candidatos
    const { data: candidatos = [], isLoading: loadingCandidatos } = useQuery({
        queryKey: ['candidatos'],
        queryFn: fetchCandidatos,
        enabled: !!session,
    })

    // Query de Vacantes
    const { data: vacantes = [], isLoading: loadingVacantes } = useQuery({
        queryKey: ['vacantes'],
        queryFn: fetchVacantes,
        enabled: !!session,
    })

    // Query de Actividades Recientes
    const { data: actividadReciente = [], isLoading: loadingActividades } = useQuery({
        queryKey: ['actividades'],
        queryFn: fetchActividades,
        enabled: !!session,
    })

    // Loading global derivado
    const loading = loadingCandidatos || loadingVacantes || loadingActividades

    // Refetch funcional remapeado a Invalidate Queries
    const refetchAll = React.useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['candidatos'] })
        await queryClient.invalidateQueries({ queryKey: ['vacantes'] })
        await queryClient.invalidateQueries({ queryKey: ['actividades'] })
    }, [queryClient])

    const contextValue = React.useMemo(() => ({
        candidatos,
        vacantes,
        actividadReciente,
        loading,
        refetch: refetchAll
    }), [candidatos, vacantes, actividadReciente, loading, refetchAll])

    return (
        <DashboardContext.Provider value={contextValue}>
            {children}
        </DashboardContext.Provider>
    )
}


export const useDashboardData = () => {
    const context = useContext(DashboardContext)
    if (!context) {
        throw new Error('useDashboardData must be used within DashboardProvider')
    }
    return context
}
