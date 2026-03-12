// ATLAS GSE - Sistema de Emails con Resend
// Fallback a logs si no hay API key configurada

type EmailTemplate = 'invitacion' | 'entrevista' | 'oferta' | 'rechazo' | 'bienvenida'

interface EmailData {
  [key: string]: unknown
}

interface SendEmailParams {
  to: string | string[]
  template: EmailTemplate
  data: EmailData
}

interface EmailTemplateResult {
  subject: string
  html: string
  text: string
}

// Plantillas de email
const templates: Record<EmailTemplate, (data: EmailData) => EmailTemplateResult> = {
  invitacion: (data) => ({
    subject: `Has sido invitado a ATLAS GSE - ${data.empresaNombre || 'Nueva Organización'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">ATLAS GSE</h1>
          <p style="color: #ffffff; margin-top: 10px;">Sistema de Gestión de Reclutamiento</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e;">¡Has sido invitado!</h2>
          <p style="color: #333; line-height: 1.6;">
            <strong>${data.invitadoPor || 'Un administrador'}</strong> te ha invitado a unirte a 
            <strong>${data.empresaNombre || 'la organización'}</strong> como <strong>${data.rol || 'Reclutador'}</strong>.
          </p>
          <div style="margin: 30px 0;">
            <a href="${data.enlace}" style="background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%); color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Aceptar Invitación
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Este enlace expira en 7 días.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Si no solicitaste esta invitación, puedes ignorar este correo.
          </p>
        </div>
      </div>
    `,
    text: `Has sido invitado a ATLAS GSE por ${data.invitadoPor || 'un administrador'} como ${data.rol || 'Reclutador'}. Acepta la invitación en: ${data.enlace}`,
  }),

  entrevista: (data) => ({
    subject: `Confirmación de Entrevista - ${data.vacanteTitulo || 'ATLAS GSE'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #d4af37; margin: 0;">ATLAS GSE</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e;">Confirmación de Entrevista</h2>
          <p style="color: #333;">Hola <strong>${data.candidatoNombre}</strong>,</p>
          <p style="color: #333;">Tu entrevista ha sido programada:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Vacante:</strong> ${data.vacanteTitulo}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${data.fecha}</p>
            <p style="margin: 5px 0;"><strong>Hora:</strong> ${data.hora}</p>
            <p style="margin: 5px 0;"><strong>Modalidad:</strong> ${data.modalidad}</p>
            ${data.ubicacion ? `<p style="margin: 5px 0;"><strong>Ubicación/Enlace:</strong> ${data.ubicacion}</p>` : ''}
          </div>
          <p style="color: #666; font-size: 14px;">Por favor confirma tu asistencia respondiendo a este correo.</p>
        </div>
      </div>
    `,
    text: `Entrevista confirmada para ${data.candidatoNombre}. Vacante: ${data.vacanteTitulo}. Fecha: ${data.fecha} a las ${data.hora}. Modalidad: ${data.modalidad}.`,
  }),

  oferta: (data) => ({
    subject: `¡Felicidades! Oferta de Empleo - ${data.vacanteTitulo || 'ATLAS GSE'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #d4af37; margin: 0;">🎉 ¡Felicidades!</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e;">Oferta de Empleo</h2>
          <p style="color: #333;">Estimado/a <strong>${data.candidatoNombre}</strong>,</p>
          <p style="color: #333;">Nos complace ofrecerte la posición de <strong>${data.vacanteTitulo}</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Salario:</strong> ${data.salario || 'A discutir'}</p>
            <p style="margin: 5px 0;"><strong>Fecha de inicio:</strong> ${data.fechaInicio || 'Por confirmar'}</p>
            <p style="margin: 5px 0;"><strong>Ubicación:</strong> ${data.ubicacion || 'Remoto'}</p>
          </div>
          <p style="color: #333;">Adjuntamos los detalles completos de la oferta. Por favor revisa y firma para confirmar tu aceptación.</p>
          <div style="margin: 30px 0;">
            <a href="${data.enlaceRespuesta}" style="background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%); color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Responder Oferta
            </a>
          </div>
        </div>
      </div>
    `,
    text: `¡Felicidades ${data.candidatoNombre}! Te ofrecemos la posición de ${data.vacanteTitulo}. Salario: ${data.salario}. Responde en: ${data.enlaceRespuesta}`,
  }),

  rechazo: (data) => ({
    subject: `Actualización de tu Candidatura - ${data.vacanteTitulo || 'ATLAS GSE'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #d4af37; margin: 0;">ATLAS GSE</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e;">Actualización de Candidatura</h2>
          <p style="color: #333;">Estimado/a <strong>${data.candidatoNombre}</strong>,</p>
          <p style="color: #333;">Agradecemos tu interés en la posición de <strong>${data.vacanteTitulo}</strong>.</p>
          <p style="color: #333;">Después de cuidadosa consideración, hemos decidido continuar con otros candidatos para esta posición. Esto no refleja tus capacidades, sino el ajuste específico con nuestros requerimientos actuales.</p>
          <p style="color: #333;">Te mantendremos en nuestra base de datos para futuras oportunidades que se ajusten a tu perfil.</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Te deseamos mucho éxito en tu búsqueda laboral.</p>
        </div>
      </div>
    `,
    text: `Estimado/a ${data.candidatoNombre}, agradecemos tu interés en ${data.vacanteTitulo}. Hemos decidido continuar con otros candidatos. Te mantendremos en nuestra base de datos para futuras oportunidades.`,
  }),

  bienvenida: (data) => ({
    subject: `¡Bienvenido a ATLAS GSE! - ${data.empresaNombre || 'Tu Organización'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #d4af37; margin: 0;">¡Bienvenido!</h1>
          <p style="color: #ffffff; margin-top: 10px;">ATLAS GSE</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a2e;">Hola, <strong>${data.nombre}</strong></h2>
          <p style="color: #333;">Tu cuenta ha sido creada exitosamente en <strong>${data.empresaNombre || 'ATLAS GSE'}</strong>.</p>
          <p style="color: #333;">Tu rol es: <strong>${data.rol}</strong></p>
          <div style="margin: 30px 0;">
            <a href="${data.enlaceLogin}" style="background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%); color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Acceder al Sistema
            </a>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1a1a2e;">Funcionalidades principales:</h3>
            <ul style="color: #333;">
              <li>Gestión de candidatos con Kanban</li>
              <li>Publicación de vacantes</li>
              <li>Seguimiento de procesos de reclutamiento</li>
              <li>Reportes y métricas</li>
            </ul>
          </div>
        </div>
      </div>
    `,
    text: `¡Bienvenido ${data.nombre}! Tu cuenta ha sido creada en ${data.empresaNombre || 'ATLAS GSE'} como ${data.rol}. Accede en: ${data.enlaceLogin}`,
  }),
}

// Función para enviar email
export async function sendEmail({ to, template, data }: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const templateResult = templates[template](data)
  const recipients = Array.isArray(to) ? to : [to]

  // Verificar si hay API key de Resend
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey || resendApiKey === '' || resendApiKey === 're_tu_api_key') {
    // Fallback: loguear el email
    console.log('\n' + '='.repeat(60))
    console.log('📧 EMAIL (MODO DESARROLLO - Sin API Key de Resend)')
    console.log('='.repeat(60))
    console.log(`Para: ${recipients.join(', ')}`)
    console.log(`Asunto: ${templateResult.subject}`)
    console.log('-'.repeat(60))
    console.log('Texto:')
    console.log(templateResult.text)
    console.log('-'.repeat(60))
    console.log('HTML disponible pero no mostrado para brevedad.')
    console.log('='.repeat(60) + '\n')

    return { success: true, id: `log-${Date.now()}` }
  }

  try {
    // Usar Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Atlas <noreply@atlas.local>',
        to: recipients,
        subject: templateResult.subject,
        html: templateResult.html,
        text: templateResult.text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Error enviando email con Resend:', errorData)
      return { success: false, error: errorData.message || 'Error al enviar email' }
    }

    const result = await response.json()
    console.log(`✅ Email enviado exitosamente a ${recipients.join(', ')}`)
    return { success: true, id: result.id }
  } catch (error) {
    console.error('Error enviando email:', error)
    return { success: false, error: String(error) }
  }
}

// Funciones helper para cada tipo de email
export const emailInvitacion = (to: string, data: {
  invitadoPor: string
  empresaNombre: string
  rol: string
  enlace: string
}) => sendEmail({ to, template: 'invitacion', data })

export const emailEntrevista = (to: string, data: {
  candidatoNombre: string
  vacanteTitulo: string
  fecha: string
  hora: string
  modalidad: string
  ubicacion?: string
}) => sendEmail({ to, template: 'entrevista', data })

export const emailOferta = (to: string, data: {
  candidatoNombre: string
  vacanteTitulo: string
  salario?: string
  fechaInicio?: string
  ubicacion?: string
  enlaceRespuesta: string
}) => sendEmail({ to, template: 'oferta', data })

export const emailRechazo = (to: string, data: {
  candidatoNombre: string
  vacanteTitulo: string
}) => sendEmail({ to, template: 'rechazo', data })

export const emailBienvenida = (to: string, data: {
  nombre: string
  empresaNombre: string
  rol: string
  enlaceLogin: string
}) => sendEmail({ to, template: 'bienvenida', data })
