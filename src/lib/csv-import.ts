export interface CsvParseResult {
  rows: string[][]
  delimiter: ',' | ';'
}

export interface ImportedCandidateRow {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  fuente?: string
  notas?: string
  tags?: string
  linkedin?: string
  portfolio?: string
}

export interface CandidateRowValidation {
  index: number
  row: ImportedCandidateRow
  errors: string[]
}

function normalizeLineBreaks(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function parseCsv(input: string): CsvParseResult {
  const normalized = normalizeLineBreaks(input).trim()
  const delimiter: ',' | ';' = normalized.includes(';') && !normalized.includes(',') ? ';' : ','

  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]
    const next = normalized[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      row.push(current.trim())
      current = ''
      continue
    }

    if (char === '\n' && !inQuotes) {
      row.push(current.trim())
      rows.push(row)
      row = []
      current = ''
      continue
    }

    current += char
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim())
    rows.push(row)
  }

  return { rows, delimiter }
}

function toCandidateRow(headers: string[], values: string[]): ImportedCandidateRow {
  const map = new Map<string, string>()
  headers.forEach((header, index) => {
    map.set(header.toLowerCase().trim(), values[index]?.trim() ?? '')
  })

  return {
    nombre: map.get('nombre') || map.get('name') || '',
    apellido: map.get('apellido') || map.get('last_name') || map.get('apellidos') || '',
    email: (map.get('email') || map.get('correo') || '').toLowerCase(),
    telefono: map.get('telefono') || map.get('phone') || '',
    fuente: map.get('fuente') || map.get('source') || 'OTRO',
    notas: map.get('notas') || map.get('notes') || '',
    tags: map.get('tags') || '',
    linkedin: map.get('linkedin') || '',
    portfolio: map.get('portfolio') || '',
  }
}

export function parseCandidateCsv(input: string): ImportedCandidateRow[] {
  const { rows } = parseCsv(input)
  if (rows.length < 2) return []

  const [headers, ...dataRows] = rows
  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => toCandidateRow(headers, row))
}

export function validateCandidateRows(rows: ImportedCandidateRow[]): CandidateRowValidation[] {
  return rows.map((row, idx) => {
    const errors: string[] = []
    if (!row.nombre || row.nombre.length < 2) errors.push('nombre inválido')
    if (!row.apellido || row.apellido.length < 2) errors.push('apellido inválido')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('email inválido')

    return {
      index: idx + 1,
      row,
      errors,
    }
  })
}
