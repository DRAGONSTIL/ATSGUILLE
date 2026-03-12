# ATLAS Google Form Webhook Intake

## 1) Crear IntakeKey

```bash
npm run intake:key:create -- <empresaId> <equipoId> "Google Form Tienda Norte"
```

Salida:
- `id` => usar como `ATLAS_INTAKE_KEY_ID`
- `secret` => usar como `ATLAS_INTAKE_SECRET` (se muestra una sola vez)

## 2) Instalar Apps Script

1. Abrir el Google Sheet vinculado al Form.
2. Extensiones -> Apps Script.
3. Pegar `integrations/google-form-intake.gs`.
4. En Project Settings -> Script Properties, definir:
   - `ATLAS_ENDPOINT` (`https://tu-dominio/api/intake/form-submission`)
   - `ATLAS_INTAKE_KEY_ID`
   - `ATLAS_INTAKE_SECRET`
5. Crear trigger instalable:
   - Function: `onFormSubmit`
   - Event source: From spreadsheet
   - Event type: On form submit

## 3) Probar con curl

```bash
BODY='{"fullName":"Ana Pérez","email":"ana@example.com","phone":"5551234567","submittedAt":"2026-02-23T12:00:00.000Z","sheetId":"sheet-1","sheetName":"Form Responses 1","rowNumber":10,"rawAnswers":{"Nombre completo":"Ana Pérez"}}'
TS=$(date +%s)
NONCE=$(uuidgen)
MSG="$TS.$NONCE.$BODY"
SIG=$(printf %s "$MSG" | openssl dgst -sha256 -hmac "$ATLAS_INTAKE_SECRET" -hex | sed 's/^.* //')

curl -X POST "$ATLAS_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-ATLAS-TIMESTAMP: $TS" \
  -H "X-ATLAS-NONCE: $NONCE" \
  -H "X-ATLAS-SIGNATURE: $SIG" \
  -H "X-ATLAS-KEY: $ATLAS_INTAKE_KEY_ID" \
  -d "$BODY"
```

## 4) Troubleshooting

- `INVALID_SIGNATURE`: revisar secret/key id y que la firma use `timestamp.nonce.body` exacto.
- `STALE_TIMESTAMP`: reloj del servidor/script desfasado más de 5 minutos.
- `REPLAY`: el nonce ya fue utilizado.
- `INVALID_KEY`: intake key inactiva o inexistente.
- `VALIDATION_ERROR`: faltan campos mínimos del payload.
