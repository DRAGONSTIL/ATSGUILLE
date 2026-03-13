type EmailTemplate =
  | 'invitacion'
  | 'entrevista'
  | 'oferta'
  | 'rechazo'
  | 'bienvenida'
  | 'password_reset'

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

function renderShell(title: string, eyebrow: string, content: string): string {
  return `
    <div style="margin:0;padding:32px;background:#06070b;font-family:Arial,sans-serif;color:#e8edf7;">
      <div style="max-width:680px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#0b1020 0%,#090d18 100%);box-shadow:0 24px 80px rgba(0,0,0,0.45);">
        <div style="padding:32px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top right,rgba(243,186,47,0.16),transparent 38%),radial-gradient(circle at left center,rgba(58,114,255,0.18),transparent 42%);">
          <div style="display:inline-block;padding:8px 12px;border:1px solid rgba(243,186,47,0.25);border-radius:999px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#f3ba2f;background:rgba(243,186,47,0.08);">${eyebrow}</div>
          <h1 style="margin:18px 0 0;font-size:30px;line-height:1.1;color:#f5f7fb;">${title}</h1>
          <p style="margin:10px 0 0;color:#9ba8c7;font-size:14px;letter-spacing:0.04em;">ATLAS GSE · Secure Recruitment Operating System</p>
        </div>
        <div style="padding:32px;">
          ${content}
        </div>
      </div>
    </div>
  `
}

const templates: Record<EmailTemplate, (data: EmailData) => EmailTemplateResult> = {
  invitacion: (data) => {
    const code = String(data.codigoInvitacion || '')
    const activationLink = String(data.enlace || '')
    const company = String(data.empresaNombre || 'ATLAS GSE')
    const invitedEmail = String(data.emailInvitado || '')

    return {
      subject: `ATLAS GSE · Acceso corporativo autorizado para ${company}`,
      html: renderShell(
        'Acceso corporativo autorizado',
        'Invitation Access',
        `
          <p style="margin:0 0 18px;color:#d6def0;font-size:15px;line-height:1.8;">
            ${String(data.invitadoPor || 'Administración de plataforma')} ha autorizado tu acceso a <strong style="color:#ffffff;">${company}</strong>.
          </p>
          <p style="margin:0 0 18px;color:#9ba8c7;font-size:14px;line-height:1.8;">
            Activa tu entorno enterprise con el correo autorizado y el código de invitación de un solo uso.
          </p>
          <div style="margin:24px 0;padding:20px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
            <p style="margin:0 0 8px;color:#8b97b5;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Correo autorizado</p>
            <p style="margin:0 0 18px;color:#ffffff;font-size:18px;">${invitedEmail}</p>
            <p style="margin:0 0 8px;color:#8b97b5;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Código de invitación</p>
            <p style="margin:0;color:#f3ba2f;font-size:24px;font-weight:700;letter-spacing:0.2em;">${code}</p>
          </div>
          <div style="margin:26px 0;">
            <a href="${activationLink}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#f3ba2f 0%,#d18a1f 100%);color:#0b0f19;text-decoration:none;font-weight:700;">Activar acceso</a>
          </div>
          <p style="margin:0;color:#8b97b5;font-size:13px;line-height:1.8;">
            Si el código expira o el correo no coincide con tu cuenta autorizada, solicita una nueva invitación a tu administrador.
          </p>
        `
      ),
      text: `ATLAS GSE autorizó tu acceso a ${company}. Correo autorizado: ${invitedEmail}. Código: ${code}. Activa aquí: ${activationLink}`,
    }
  },
  entrevista: (data) => ({
    subject: `Confirmación de Entrevista - ${data.vacanteTitulo || 'ATLAS GSE'}`,
    html: renderShell(
      'Confirmación de entrevista',
      'Interview',
      `<p style="margin:0;color:#d6def0;font-size:15px;line-height:1.8;">Hola ${String(data.candidatoNombre || '')}, tu entrevista para <strong>${String(data.vacanteTitulo || '')}</strong> quedó programada para ${String(data.fecha || '')} a las ${String(data.hora || '')}.</p>`
    ),
    text: `Entrevista confirmada para ${data.candidatoNombre}. Vacante: ${data.vacanteTitulo}. Fecha: ${data.fecha} ${data.hora}.`,
  }),
  oferta: (data) => ({
    subject: `Oferta de empleo - ${data.vacanteTitulo || 'ATLAS GSE'}`,
    html: renderShell(
      'Oferta de empleo',
      'Offer',
      `<p style="margin:0;color:#d6def0;font-size:15px;line-height:1.8;">${String(data.candidatoNombre || '')}, hemos preparado una oferta para la posición <strong>${String(data.vacanteTitulo || '')}</strong>. Revisa los detalles en el enlace adjunto.</p>`
    ),
    text: `Oferta enviada a ${data.candidatoNombre} para ${data.vacanteTitulo}.`,
  }),
  rechazo: (data) => ({
    subject: `Actualización de candidatura - ${data.vacanteTitulo || 'ATLAS GSE'}`,
    html: renderShell(
      'Actualización de candidatura',
      'Candidate Update',
      `<p style="margin:0;color:#d6def0;font-size:15px;line-height:1.8;">${String(data.candidatoNombre || '')}, agradecemos tu interés en <strong>${String(data.vacanteTitulo || '')}</strong>. En esta ocasión continuaremos con otro perfil, conservando tu información para futuras oportunidades.</p>`
    ),
    text: `Actualización de candidatura para ${data.candidatoNombre}.`,
  }),
  bienvenida: (data) => ({
    subject: `ATLAS GSE · Entorno activado`,
    html: renderShell(
      'Entorno activado',
      'Welcome',
      `
        <p style="margin:0 0 18px;color:#d6def0;font-size:15px;line-height:1.8;">
          ${String(data.nombre || 'Tu cuenta')} ya puede operar dentro de <strong>${String(data.empresaNombre || 'ATLAS GSE')}</strong>.
        </p>
        <p style="margin:0 0 24px;color:#9ba8c7;font-size:14px;line-height:1.8;">
          Rol asignado: ${String(data.rol || 'Reclutamiento')}.
        </p>
        <a href="${String(data.enlaceLogin || '#')}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#f3ba2f 0%,#d18a1f 100%);color:#0b0f19;text-decoration:none;font-weight:700;">Ingresar a la plataforma</a>
      `
    ),
    text: `Cuenta activada para ${data.nombre} en ${data.empresaNombre}.`,
  }),
  password_reset: (data) => ({
    subject: 'ATLAS GSE · Restablecimiento de acceso',
    html: renderShell(
      'Restablecimiento de acceso',
      'Security',
      `
        <p style="margin:0 0 18px;color:#d6def0;font-size:15px;line-height:1.8;">
          Recibimos una solicitud para restablecer la contraseña del entorno autorizado <strong>${String(data.email || '')}</strong>.
        </p>
        <p style="margin:0 0 24px;color:#9ba8c7;font-size:14px;line-height:1.8;">
          Este enlace es temporal y se invalidará al primer uso o al expirar.
        </p>
        <a href="${String(data.enlace || '#')}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#f3ba2f 0%,#d18a1f 100%);color:#0b0f19;text-decoration:none;font-weight:700;">Restablecer contraseña</a>
      `
    ),
    text: `Restablece tu contraseña aquí: ${String(data.enlace || '')}`,
  }),
}

export async function sendEmail({ to, template, data }: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const templateResult = templates[template](data)
  const recipients = Array.isArray(to) ? to : [to]
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey || resendApiKey === 're_tu_api_key') {
    console.log('\n' + '='.repeat(60))
    console.log('EMAIL DEV MODE')
    console.log(`Para: ${recipients.join(', ')}`)
    console.log(`Asunto: ${templateResult.subject}`)
    console.log(templateResult.text)
    console.log('='.repeat(60) + '\n')
    return { success: true, id: `log-${Date.now()}` }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'ATLAS GSE <noreply@atlas.local>',
        to: recipients,
        subject: templateResult.subject,
        html: templateResult.html,
        text: templateResult.text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message || 'Error al enviar el correo.' }
    }

    const result = await response.json()
    return { success: true, id: result.id }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export const emailInvitacion = (
  to: string,
  data: {
    invitadoPor: string
    empresaNombre: string
    rol: string
    enlace: string
    codigoInvitacion: string | null
    emailInvitado: string
  }
) => sendEmail({ to, template: 'invitacion', data })

export const emailEntrevista = (to: string, data: Record<string, unknown>) =>
  sendEmail({ to, template: 'entrevista', data })

export const emailOferta = (to: string, data: Record<string, unknown>) =>
  sendEmail({ to, template: 'oferta', data })

export const emailRechazo = (to: string, data: Record<string, unknown>) =>
  sendEmail({ to, template: 'rechazo', data })

export const emailBienvenida = (
  to: string,
  data: {
    nombre: string
    empresaNombre: string
    rol: string
    enlaceLogin: string
  }
) => sendEmail({ to, template: 'bienvenida', data })

export const emailPasswordReset = (
  to: string,
  data: {
    email: string
    enlace: string
  }
) => sendEmail({ to, template: 'password_reset', data })
