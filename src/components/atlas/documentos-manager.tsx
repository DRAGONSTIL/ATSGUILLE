'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  MoreHorizontal,
  FileIcon,
  ImageIcon,
  FileSpreadsheet,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Types
type TipoDocumento = 'CV' | 'PORTAFOLIO' | 'CERTIFICADO' | 'OTRO'

interface Documento {
  id: string
  nombre: string
  tipo: TipoDocumento | string
  url: string
  createdAt: string
}

interface DocumentosManagerProps {
  documentos: Documento[]
  candidatoId: string
  onUpload: (file: File, tipo: TipoDocumento) => void
  onDelete: (id: string) => void
}

// Config
const TIPO_CONFIG: Record<TipoDocumento, { label: string; icon: any; color: string }> = {
  CV: { label: 'CV', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
  PORTAFOLIO: { label: 'Portafolio', icon: FileSpreadsheet, color: 'bg-purple-500/20 text-purple-400' },
  CERTIFICADO: { label: 'Certificado', icon: FileText, color: 'bg-green-500/20 text-green-400' },
  OTRO: { label: 'Otro', icon: FileIcon, color: 'bg-slate-500/20 text-slate-400' },
}

// Obtener icono según extensión
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return ImageIcon
  }
  return FileIcon
}

export function DocumentosManager({
  documentos,
  candidatoId,
  onUpload,
  onDelete,
}: DocumentosManagerProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumento>('CV')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, selectedTipo)
      setSelectedFile(null)
      setSelectedTipo('CV')
      setIsUploadDialogOpen(false)
    }
  }

  const handleDownload = (documento: Documento) => {
    window.open(documento.url, '_blank')
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Documentos
              <Badge variant="secondary" className="ml-2">
                {documentos.length}
              </Badge>
            </CardTitle>
            <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Subir
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {documentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay documentos</p>
              <p className="text-sm">Sube CVs, portafolios o certificados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documentos.map((documento) => {
                const tipoConfig = TIPO_CONFIG[documento.tipo as TipoDocumento] || TIPO_CONFIG.OTRO
                const FileIconComponent = getFileIcon(documento.nombre)

                return (
                  <div
                    key={documento.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <FileIconComponent className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{documento.nombre}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={tipoConfig.color}>
                          {tipoConfig.label}
                        </Badge>
                        <span>
                          {format(new Date(documento.createdAt), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(documento)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(documento)}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(documento.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de upload */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag and drop area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <FileIcon className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p>Arrastra un archivo aquí o</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Seleccionar archivo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Imágenes (máx 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Tipo selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de documento</label>
              <Select
                value={selectedTipo}
                onValueChange={(v) => setSelectedTipo(v as TipoDocumento)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CV">CV / Currículum</SelectItem>
                  <SelectItem value="PORTAFOLIO">Portafolio</SelectItem>
                  <SelectItem value="CERTIFICADO">Certificado</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile}>
              Subir Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
