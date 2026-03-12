import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

type EmailTemplate = 'invitacion' | 'entrevista' | 'oferta' | 'rechazo' | 'bienvenida'

export interface EmailQueueJob {
  id: string
  to: string | string[]
  template: EmailTemplate
  data: Record<string, unknown>
  attempts: number
  createdAt: number
}

const queue: EmailQueueJob[] = []
const deadLetter: EmailQueueJob[] = []
const MAX_ATTEMPTS = 3

let processing = false

function nextBackoffMs(attempts: number): number {
  return Math.min(5000, 500 * 2 ** (attempts - 1))
}

async function processQueue() {
  if (processing) return
  processing = true

  try {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) continue

      const result = await sendEmail({
        to: job.to,
        template: job.template,
        data: job.data,
      })

      if (result.success) {
        logger.info('email_job_sent', { jobId: job.id })
        continue
      }

      const nextAttempt = job.attempts + 1
      if (nextAttempt >= MAX_ATTEMPTS) {
        deadLetter.push({ ...job, attempts: nextAttempt })
        logger.error('email_job_dead_letter', { jobId: job.id, attempts: nextAttempt, error: result.error })
        continue
      }

      const retryJob = { ...job, attempts: nextAttempt }
      setTimeout(() => {
        queue.push(retryJob)
        void processQueue()
      }, nextBackoffMs(nextAttempt))

      logger.warn('email_job_retry_scheduled', { jobId: job.id, attempts: nextAttempt })
    }
  } finally {
    processing = false
  }
}

export function enqueueEmailJob(job: Omit<EmailQueueJob, 'attempts' | 'createdAt'>): { id: string } {
  const normalized: EmailQueueJob = {
    ...job,
    attempts: 0,
    createdAt: Date.now(),
  }

  queue.push(normalized)
  void processQueue()

  return { id: normalized.id }
}

export function getEmailQueueStats() {
  return {
    pending: queue.length,
    deadLetter: deadLetter.length,
  }
}
