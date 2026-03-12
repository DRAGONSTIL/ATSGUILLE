'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Search,
  MoreHorizontal,
  ArrowUpDown,
  Users,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText,
  ArrowRight,
  Upload,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

// Types
type EstatusCandidato = 'REGISTRADO' | 'EN_PROCESO' | 'ENTREVISTA' | 'CONTRATADO' | 'RECHAZADO'
type FuenteCandidato = 'LINKEDIN' | 'OCC' | 'COMPUTRABAJA' | 'COMPUTRABAJO' | 'REFERIDO' | 'AGENCIA' | 'FERIA_EMPLEO' | 'UNIVERSIDAD' | 'RED_SOCIAL' | 'INDEED' | 'OTRO'

interface Candidato {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  fuente: FuenteCandidato
  estatus: EstatusCandidato
  notas?: string | null
  createdAt: string
  vacante?: { id: string; titulo: string } | null
  reclutador?: { id: string; name: string | null } | null
  documentos?: { id: string; nombre: string; tipo: string; url: string; createdAt: string }[]
}

interface CandidatesTableProps {
  candidatos: Candidato[]
  onSelectCandidato: (id: string) => void
  onStatusChange: (id: string, estatus: EstatusCandidato) => void
  onBulkAction: (ids: string[], action: string, data?: any) => void
  onDelete: (id: string) => void
  globalSearch?: string
  onRefresh?: () => void
  userRole?: string
}

// Estatus badge colors
const ESTATUS_COLORS: Record<EstatusCandidato, string> = {
  REGISTRADO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  EN_PROCESO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ENTREVISTA: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  CONTRATADO: 'bg-green-500/20 text-green-400 border-green-500/30',
  RECHAZADO: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const ESTATUS_LABELS: Record<EstatusCandidato, string> = {
  REGISTRADO: 'Registrado',
  EN_PROCESO: 'En Proceso',
  ENTREVISTA: 'Entrevista',
  CONTRATADO: 'Contratado',
  RECHAZADO: 'Rechazado',
}

const FUENTE_LABELS: Record<FuenteCandidato, string> = {
  LINKEDIN: 'LinkedIn',
  OCC: 'OCC',
  COMPUTRABAJA: 'Computrabajo',
  COMPUTRABAJO: 'Computrabajo',
  REFERIDO: 'Referido',
  AGENCIA: 'Agencia',
  FERIA_EMPLEO: 'Feria de Empleo',
  UNIVERSIDAD: 'Universidad',
  RED_SOCIAL: 'Red Social',
  INDEED: 'Indeed',
  OTRO: 'Otra',
}

export function CandidatesTable({
  candidatos,
  onSelectCandidato,
  onStatusChange,
  onBulkAction,
  onDelete,
  globalSearch,
  onRefresh,
  userRole,
}: CandidatesTableProps) {
  const [search, setSearch] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<string>('all')
  const [filtroVacante, setFiltroVacante] = useState<string>('all')
  const [filtroFuente, setFiltroFuente] = useState<string>('all')
  const [filtroReclutador, setFiltroReclutador] = useState<string>('all')
  const [showImportSheet, setShowImportSheet] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<string[][]>([])
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importMapping, setImportMapping] = useState<Record<string, string>>({})
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ importados: number, omitidos: number, errores: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): string[][] =>
    text.split('\n').filter((l) => l.trim()).map((l) =>
      l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    )

  const CAMPOS = ['nombre', 'apellido', 'email', 'telefono', 'fuente', 'notas', 'tags', 'linkedin', 'portfolio']

  const handleFileSelect = (file: File) => {
    setImportFile(file)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows = parseCSV(e.target?.result as string)
      const headers = rows[0] || []
      setImportHeaders(headers)
      setImportPreview(rows.slice(1, 6))
      const mapping: Record<string, string> = {}
      headers.forEach((h, i) => {
        const norm = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        if (CAMPOS.includes(norm)) mapping[norm] = String(i)
      })
      setImportMapping(mapping)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importFile) return
    setImportLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const rows = parseCSV(e.target?.result as string)
        const dataRows = rows.slice(1)
        const getCol = (field: string, row: string[]) => {
          const idx = importMapping[field]
          return idx !== undefined ? (row[Number(idx)] || '') : ''
        }
        const candidatosImport = dataRows
          .filter((r) => r.some((c) => c.trim()))
          .map((row) => ({
            nombre: getCol('nombre', row),
            apellido: getCol('apellido', row),
            email: getCol('email', row),
            telefono: getCol('telefono', row) || undefined,
            fuente: getCol('fuente', row) || undefined,
            notas: getCol('notas', row) || undefined,
            tags: getCol('tags', row) || undefined,
            linkedin: getCol('linkedin', row) || undefined,
            portfolio: getCol('portfolio', row) || undefined,
          }))
          .filter((c) => c.nombre && c.apellido && c.email)

        const res = await fetch('/api/candidatos/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidatos: candidatosImport }),
        })
        const result = await res.json()
        setImportResult(result)
        if (result.importados > 0) onRefresh?.()
      }
      reader.readAsText(importFile)
    } finally {
      setImportLoading(false)
    }
  }

  const vacantesUnicas = useMemo(() => {
    const map = new Map<string, string>()
    candidatos.forEach((c) => {
      if (c.vacante?.id && c.vacante.titulo) map.set(c.vacante.id, c.vacante.titulo)
    })
    return Array.from(map.entries()).map(([id, titulo]) => ({ id, titulo }))
  }, [candidatos])

  const fuentesUnicas = useMemo(() => Array.from(new Set(candidatos.map((c) => c.fuente))), [candidatos])

  const reclutadoresUnicos = useMemo(() => {
    const map = new Map<string, string>()
    candidatos.forEach((c) => {
      if (c.reclutador?.id) map.set(c.reclutador.id, c.reclutador.name || 'Sin nombre')
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [candidatos])

  const hasActiveFilters = filtroEstatus !== 'all' || filtroVacante !== 'all' || filtroFuente !== 'all' || filtroReclutador !== 'all' || !!search || !!globalSearch

  const limpiarFiltros = () => {
    setSearch('')
    setFiltroEstatus('all')
    setFiltroVacante('all')
    setFiltroFuente('all')
    setFiltroReclutador('all')
  }

  const columns: ColumnDef<Candidato>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "nombre",
      header: ({ column }) => {
        return (
          <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const nombre = row.original.nombre
        const apellido = row.original.apellido
        const telefono = row.original.telefono
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                {nombre[0]}{apellido[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{nombre} {apellido}</span>
              {telefono && <span className="text-xs text-muted-foreground">{telefono}</span>}
            </div>
          </div>
        )
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = `${rowA.original.nombre} ${rowA.original.apellido}`.toLowerCase()
        const b = `${rowB.original.nombre} ${rowB.original.apellido}`.toLowerCase()
        return a.localeCompare(b)
      }
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>
    },
    {
      accessorKey: "estatus",
      header: "Estatus",
      cell: ({ row }) => {
        const estatus = row.getValue("estatus") as EstatusCandidato
        return (
          <Badge variant="outline" className={ESTATUS_COLORS[estatus]}>
            {ESTATUS_LABELS[estatus]}
          </Badge>
        )
      }
    },
    {
      accessorKey: "vacanteId",
      header: "Vacante",
      cell: ({ row }) => {
        const vacante = row.original.vacante
        return <span className="max-w-32 truncate block">{vacante?.titulo || '-'}</span>
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === 'all') return true
        return row.original.vacante?.id === filterValue
      }
    },
    {
      accessorKey: "fuente",
      header: "Fuente",
      cell: ({ row }) => {
        const fuente = row.getValue("fuente") as FuenteCandidato
        return <Badge variant="secondary" className="font-normal">{FUENTE_LABELS[fuente]}</Badge>
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === 'all') return true
        return row.getValue("fuente") === filterValue
      }
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const dateStr = row.getValue("createdAt") as string
        return <span className="text-muted-foreground">{format(new Date(dateStr), 'dd MMM yyyy', { locale: es })}</span>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const id = row.original.id
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSelectCandidato(id)}>
                  <FileText className="mr-2 h-4 w-4" /> Ver detalle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [onSelectCandidato, onDelete])

  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data: candidatos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter: search || globalSearch,
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const searchStr = filterValue.toLowerCase()
      const n = row.original.nombre.toLowerCase()
      const a = row.original.apellido.toLowerCase()
      const e = row.original.email.toLowerCase()
      const t = (row.original.telefono || '').toLowerCase()
      const v = (row.original.vacante?.titulo || '').toLowerCase()
      return n.includes(searchStr) || a.includes(searchStr) || e.includes(searchStr) || t.includes(searchStr) || v.includes(searchStr)
    },
  })

  // Synchronize internal filter states to TanStack column filters
  useMemo(() => {
    table.getColumn('estatus')?.setFilterValue(filtroEstatus === 'all' ? undefined : filtroEstatus)
  }, [filtroEstatus, table])

  useMemo(() => {
    table.getColumn('vacanteId')?.setFilterValue(filtroVacante === 'all' ? undefined : filtroVacante)
  }, [filtroVacante, table])

  useMemo(() => {
    table.getColumn('fuente')?.setFilterValue(filtroFuente === 'all' ? undefined : filtroFuente)
  }, [filtroFuente, table])

  // Custom Reclutador Filter logic (needs manual handling since column isn't rendered directly, but we can hook into global filter if needed)
  // For simplicity, we just filter the data object directly if specialized filters are outside tanstack columns
  const tableData = table.getRowModel().rows
  const filteredCount = tableData.length

  const handleBulkActionWrapper = (action: string, data?: any) => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(r => r.original.id)
    if (selectedIds.length > 0) {
      onBulkAction(selectedIds, action, data)
      table.resetRowSelection()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidatos
            <Badge variant="secondary" className="ml-2">
              {filteredCount}
            </Badge>
          </CardTitle>

          <div className="flex flex-wrap gap-2 items-center overflow-x-auto max-w-full">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  table.setPageIndex(0)
                }}
                className="pl-9 w-48"
              />
            </div>

            {/* Filtro estatus */}
            <Select
              value={filtroEstatus}
              onValueChange={(v) => {
                setFiltroEstatus(v)
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(ESTATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroVacante} onValueChange={(v) => { setFiltroVacante(v); table.setPageIndex(0) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Vacante" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas vacantes</SelectItem>
                {vacantesUnicas.map((v) => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroFuente} onValueChange={(v) => { setFiltroFuente(v); table.setPageIndex(0) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas fuentes</SelectItem>
                {fuentesUnicas.map((f) => <SelectItem key={f} value={f}>{FUENTE_LABELS[f]}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroReclutador} onValueChange={(v) => { setFiltroReclutador(v); table.setPageIndex(0) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Reclutador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos reclutadores</SelectItem>
                {reclutadoresUnicos.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              {search && (
                <Badge variant="secondary" className="gap-1">Búsqueda: {search}<button onClick={() => setSearch('')} aria-label="Quitar búsqueda"><X className="h-3 w-3" /></button></Badge>
              )}
              {filtroEstatus !== 'all' && (
                <Badge variant="secondary" className="gap-1">Estatus: {ESTATUS_LABELS[filtroEstatus as EstatusCandidato]}<button onClick={() => setFiltroEstatus('all')} aria-label="Quitar estatus"><X className="h-3 w-3" /></button></Badge>
              )}
              {filtroVacante !== 'all' && (
                <Badge variant="secondary" className="gap-1">Vacante: {vacantesUnicas.find((v) => v.id === filtroVacante)?.titulo}<button onClick={() => setFiltroVacante('all')} aria-label="Quitar vacante"><X className="h-3 w-3" /></button></Badge>
              )}
              {filtroFuente !== 'all' && (
                <Badge variant="secondary" className="gap-1">Fuente: {FUENTE_LABELS[filtroFuente as FuenteCandidato]}<button onClick={() => setFiltroFuente('all')} aria-label="Quitar fuente"><X className="h-3 w-3" /></button></Badge>
              )}
              {filtroReclutador !== 'all' && (
                <Badge variant="secondary" className="gap-1">Reclutador: {reclutadoresUnicos.find((r) => r.id === filtroReclutador)?.name}<button onClick={() => setFiltroReclutador('all')} aria-label="Quitar reclutador"><X className="h-3 w-3" /></button></Badge>
              )}
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={limpiarFiltros}>Limpiar filtros</Button>
            )}

            {(userRole === 'ADMIN' || userRole === 'GERENTE') && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setShowImportSheet(true); setImportFile(null); setImportPreview([]); setImportResult(null) }}>
                  <Upload className="h-4 w-4 mr-2" />Importar CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
              </>
            )}

            {/* Acciones masivas */}
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {table.getFilteredSelectedRowModel().rows.length} seleccionados
                    <MoreHorizontal className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkActionWrapper('cambiar_estatus', 'EN_PROCESO')}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Mover a En Proceso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkActionWrapper('cambiar_estatus', 'ENTREVISTA')}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Mover a Entrevista
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleBulkActionWrapper('eliminar')}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar ({table.getFilteredSelectedRowModel().rows.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">{filteredCount} de {candidatos.length} candidatos</p>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => onSelectCandidato(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    <div className="space-y-1"><p className="font-semibold tracking-tight">Sin candidatos para mostrar</p><p className="text-sm text-muted-foreground">Ajusta filtros o crea un nuevo candidato.</p></div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filas por página:</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v))
              }}
            >
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 30, 50, 100].map(size => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <Sheet open={showImportSheet} onOpenChange={setShowImportSheet}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>Importar candidatos desde CSV</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{importFile ? importFile.name : 'Arrastra un CSV o haz click'}</p>
              <p className="text-xs text-muted-foreground mt-1">Columnas requeridas: nombre, apellido, email</p>
            </div>

            {importPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Vista previa:</p>
                <div className="overflow-x-auto border rounded-md text-xs">
                  <table className="w-full">
                    <thead><tr className="bg-muted">{importHeaders.map((h, i) => <th key={i} className="p-1 text-left font-medium">{h}</th>)}</tr></thead>
                    <tbody>{importPreview.map((row, i) => <tr key={i} className="border-t">{row.map((cell, j) => <td key={j} className="p-1 max-w-[80px] truncate">{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Campos detectados: {Object.keys(importMapping).join(', ') || 'Ninguno (verifica nombres de columnas)'}
                </p>
              </div>
            )}

            {importResult && (
              <div className="p-4 rounded-lg bg-muted space-y-1 text-sm">
                <p className="text-green-600 font-semibold">✅ {importResult.importados} candidatos importados</p>
                {importResult.omitidos > 0 && <p className="text-amber-600">⚠️ {importResult.omitidos} duplicados omitidos</p>}
                {importResult.errores?.length > 0 && <p className="text-destructive">❌ {importResult.errores.length} con error</p>}
              </div>
            )}

            {importFile && !importResult && (
              <Button className="w-full" onClick={handleImport} disabled={importLoading || Object.keys(importMapping).length === 0}>
                {importLoading ? 'Importando...' : 'Importar'}
              </Button>
            )}

            {!importFile && (
              <div className="text-xs text-muted-foreground space-y-1 border rounded-md p-3">
                <p className="font-medium">Formato esperado del CSV:</p>
                <p>La primera fila debe ser encabezados con estos nombres exactos:</p>
                <p className="font-mono">nombre, apellido, email, telefono, fuente, notas, tags, linkedin, portfolio</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
