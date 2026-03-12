'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
}

interface SearchResult {
  candidatos: Array<{ id: string; nombre: string; apellido: string; email: string }>
  vacantes: Array<{ id: string; titulo: string; estatus: string }>
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandItem[]
  onSelect: (id: string) => void
  onOpenCandidate?: (id: string) => void
  onOpenVacante?: (id: string) => void
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  onSelect,
  onOpenCandidate,
  onOpenVacante,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult>({ candidatos: [], vacantes: [] })

  const closePalette = () => {
    setQuery('')
    setSearchResult({ candidatos: [], vacantes: [] })
    onOpenChange(false)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      return
    }

    const controller = new AbortController()

    const run = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()
        setSearchResult({
          candidatos: data.candidatos || [],
          vacantes: data.vacantes || [],
        })
      } catch {
        // no-op
      }
    }

    void run()
    return () => controller.abort()
  }, [query])

  const visibleSearchResult = query.trim().length >= 2 ? searchResult : { candidatos: [], vacantes: [] }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closePalette()
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
        <DialogHeader>
          <DialogTitle>Búsqueda global</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ir a sección, buscar candidato o vacante..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-80 pr-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Navegación</p>
              {filtered.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => {
                    onSelect(item.id)
                    closePalette()
                  }}
                >
                  <div className="text-left">
                    <p className="font-medium">{item.label}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                </Button>
              ))}
            </div>

            {visibleSearchResult.candidatos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidatos</p>
                {visibleSearchResult.candidatos.map((candidato) => (
                  <Button
                    key={candidato.id}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => {
                      onOpenCandidate?.(candidato.id)
                      closePalette()
                    }}
                  >
                    <div className="text-left">
                      <p className="font-medium">{candidato.nombre} {candidato.apellido}</p>
                      <p className="text-xs text-muted-foreground">{candidato.email}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {visibleSearchResult.vacantes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Vacantes</p>
                {visibleSearchResult.vacantes.map((vacante) => (
                  <Button
                    key={vacante.id}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => {
                      onOpenVacante?.(vacante.id)
                      closePalette()
                    }}
                  >
                    <div className="text-left">
                      <p className="font-medium">{vacante.titulo}</p>
                      <p className="text-xs text-muted-foreground">{vacante.estatus}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {filtered.length === 0 && visibleSearchResult.candidatos.length === 0 && visibleSearchResult.vacantes.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin resultados</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
