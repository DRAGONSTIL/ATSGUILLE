// ATLAS GSE - Estado Global con Zustand

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tipos
type EstatusCandidato = 'REGISTRADO' | 'EN_PROCESO' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO'


// Estado de la UI
interface UIState {

  // Tema
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Filtros
  filtroVacante: string | null
  setFiltroVacante: (id: string | null) => void

  filtroReclutador: string | null
  setFiltroReclutador: (id: string | null) => void

  filtroEstatus: EstatusCandidato | null
  setFiltroEstatus: (estatus: EstatusCandidato | null) => void

  // Búsqueda
  busqueda: string
  setBusqueda: (query: string) => void


  // Notificaciones
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | string
  title: string
  message?: string
  createdAt: Date
}

// Store de UI
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({

      // Tema
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Filtros
      filtroVacante: null,
      setFiltroVacante: (id) => set({ filtroVacante: id }),

      filtroReclutador: null,
      setFiltroReclutador: (id) => set({ filtroReclutador: id }),

      filtroEstatus: null,
      setFiltroEstatus: (estatus) => set({ filtroEstatus: estatus }),

      // Búsqueda
      busqueda: '',
      setBusqueda: (query) => set({ busqueda: query }),


      // Notificaciones
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(),
            },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'atlas-ui-storage',
      skipHydration: true,
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<UIState> | undefined) ?? {}

        return {
          ...currentState,
          ...persisted,
        }
      },
    }
  )
)

// Store de datos de candidatos
interface CandidatosState {
  candidatos: any[]
  setCandidatos: (candidatos: any[]) => void
  addCandidato: (candidato: any) => void
  updateCandidato: (id: string, data: Partial<any>) => void
  removeCandidato: (id: string) => void
  removeCandidatos: (ids: string[]) => void

  // Estadísticas calculadas
  stats: {
    total: number
    porEstatus: Record<EstatusCandidato, number>
    porFuente: Record<string, number>
    porReclutador: Record<string, number>
  }
  recalcStats: () => void
}

export const useCandidatosStore = create<CandidatosState>((set, get) => ({
  candidatos: [],
  setCandidatos: (candidatos) => {
    set({ candidatos })
    get().recalcStats()
  },
  addCandidato: (candidato) => {
    set((state) => ({ candidatos: [...state.candidatos, candidato] }))
    get().recalcStats()
  },
  updateCandidato: (id, data) => {
    set((state) => ({
      candidatos: state.candidatos.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    get().recalcStats()
  },
  removeCandidato: (id) => {
    set((state) => ({ candidatos: state.candidatos.filter((c) => c.id !== id) }))
    get().recalcStats()
  },
  removeCandidatos: (ids) => {
    set((state) => ({ candidatos: state.candidatos.filter((c) => !ids.includes(c.id)) }))
    get().recalcStats()
  },

  stats: {
    total: 0,
    porEstatus: {
      REGISTRADO: 0,
      EN_PROCESO: 0,
      ENTREVISTA: 0,
      CONTRATADO: 0,
      RECHAZADO: 0,
    },
    porFuente: {},
    porReclutador: {},
  },
  recalcStats: () => {
    const { candidatos } = get()
    const stats = {
      total: candidatos.length,
      porEstatus: {
        REGISTRADO: candidatos.filter((c) => c.estatus === 'REGISTRADO').length,
        EN_PROCESO: candidatos.filter((c) => c.estatus === 'EN_PROCESO').length,
        ENTREVISTA: candidatos.filter((c) => c.estatus === 'ENTREVISTA').length,
        CONTRATADO: candidatos.filter((c) => c.estatus === 'CONTRATADO').length,
        RECHAZADO: candidatos.filter((c) => c.estatus === 'RECHAZADO').length,
      },
      porFuente: candidatos.reduce((acc, c) => {
        acc[c.fuente] = (acc[c.fuente] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      porReclutador: candidatos.reduce((acc, c) => {
        if (c.reclutadorId) {
          acc[c.reclutadorId] = (acc[c.reclutadorId] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>),
    }
    set({ stats })
  },
}))

// Store de vacantes
interface VacantesState {
  vacantes: any[]
  setVacantes: (vacantes: any[]) => void
  addVacante: (vacante: any) => void
  updateVacante: (id: string, data: Partial<any>) => void
  removeVacante: (id: string) => void
}

export const useVacantesStore = create<VacantesState>((set) => ({
  vacantes: [],
  setVacantes: (vacantes) => set({ vacantes }),
  addVacante: (vacante) => set((state) => ({ vacantes: [...state.vacantes, vacante] })),
  updateVacante: (id, data) =>
    set((state) => ({
      vacantes: state.vacantes.map((v) => (v.id === id ? { ...v, ...data } : v)),
    })),
  removeVacante: (id) => set((state) => ({ vacantes: state.vacantes.filter((v) => v.id !== id) })),
}))
