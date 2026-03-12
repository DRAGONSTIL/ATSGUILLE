import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCandidateCsv, parseCsv, validateCandidateRows } from '../src/lib/csv-import'

test('parseCsv supports quoted commas', () => {
  const csv = 'nombre,apellido,email,notas\n"Ana, María",Perez,ana@example.com,"Línea, con coma"'
  const parsed = parseCsv(csv)

  assert.equal(parsed.rows.length, 2)
  assert.equal(parsed.rows[1][0], 'Ana, María')
  assert.equal(parsed.rows[1][3], 'Línea, con coma')
})

test('parseCsv supports semicolon delimiter', () => {
  const csv = 'nombre;apellido;email\nAna;Perez;ana@example.com'
  const parsed = parseCsv(csv)

  assert.equal(parsed.delimiter, ';')
  assert.equal(parsed.rows[1][2], 'ana@example.com')
})

test('parseCandidateCsv maps rows and validateCandidateRows reports errors', () => {
  const csv = 'nombre,apellido,email\nAna,Perez,ana@example.com\nX,,correo-invalido'
  const rows = parseCandidateCsv(csv)
  const validation = validateCandidateRows(rows)

  assert.equal(rows.length, 2)
  assert.equal(validation[0].errors.length, 0)
  assert.ok(validation[1].errors.length >= 2)
})
