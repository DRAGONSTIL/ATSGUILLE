'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type VacantePublica = {
  id: string
  titulo: string
  descripcion?: string | null
  ubicacion?: string | null
  modalidad?: string | null
  salarioMin?: number | null
  salarioMax?: number | null
  salarioMostrar: boolean
}

export default function JobsPublicPage() {
  const params = useParams<{ empresaId: string }>()
  const [vacantes, setVacantes] = useState<VacantePublica[]>([])
  const [selectedVacante, setSelectedVacante] = useState<VacantePublica | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', mensaje: '' })

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/vacantes/public?empresaId=${params.empresaId}`)
      if (res.ok) {
        const data = await res.json()
        setVacantes(data.vacantes || [])
      }
    }
    if (params?.empresaId) load()
  }, [params?.empresaId])

  const apply = async () => {
    if (!selectedVacante) return
    const res = await fetch('/api/candidatos/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, vacanteId: selectedVacante.id }),
    })
    if (res.ok) setSuccess(true)
  }

  return (
    <main className="container mx-auto py-8 px-4 space-y-4">
      <h1 className="text-3xl font-bold">Vacantes disponibles</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vacantes.map((vacante) => (
          <Card key={vacante.id}>
            <CardHeader>
              <CardTitle>{vacante.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vacante.descripcion && <p className="text-sm text-muted-foreground">{vacante.descripcion}</p>}
              <p className="text-sm">{vacante.ubicacion || 'Ubicación no especificada'}</p>
              {vacante.modalidad && <p className="text-sm">{vacante.modalidad}</p>}
              {vacante.salarioMostrar && vacante.salarioMin && vacante.salarioMax && (
                <p className="text-sm">${vacante.salarioMin.toLocaleString()} - ${vacante.salarioMax.toLocaleString()}</p>
              )}
              <Button onClick={() => { setSelectedVacante(vacante); setOpenDialog(true); setSuccess(false) }}>Aplicar</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aplicar a {selectedVacante?.titulo}</DialogTitle>
          </DialogHeader>

          {success ? (
            <p className="text-sm">¡Gracias! Tu aplicación fue enviada correctamente.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="space-y-1"><Label>Apellido *</Label><Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div className="space-y-1"><Label>Mensaje / presentación</Label><Textarea rows={4} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} /></div>
              <Button onClick={apply} disabled={!form.nombre || !form.apellido || !form.email}>Enviar aplicación</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
