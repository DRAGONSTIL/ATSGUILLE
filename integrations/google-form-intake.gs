/**
 * Google Apps Script - ATLAS Webhook Intake
 * Trigger: onFormSubmit(e)
 * Script Properties required:
 * - ATLAS_ENDPOINT
 * - ATLAS_INTAKE_KEY_ID
 * - ATLAS_INTAKE_SECRET
 */

function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties()
  var endpoint = props.getProperty('ATLAS_ENDPOINT')
  var keyId = props.getProperty('ATLAS_INTAKE_KEY_ID')
  var secret = props.getProperty('ATLAS_INTAKE_SECRET')

  if (!endpoint || !keyId || !secret) {
    throw new Error('Missing script properties for ATLAS webhook')
  }

  var named = e.namedValues || {}
  var values = e.values || []
  var range = e.range
  var sheet = range.getSheet()
  var sheetName = sheet.getName()
  var rowNumber = range.getRow()
  var sheetId = sheet.getParent().getId()

  var fullName = getAnswer(named, ['Nombre completo', 'Full Name', 'Nombre'])
  var email = (getAnswer(named, ['Correo', 'Email']) || '').trim().toLowerCase()
  var phone = (getAnswer(named, ['Teléfono', 'Telefono', 'Phone']) || '').replace(/\D/g, '')

  var payload = {
    fullName: fullName,
    email: email,
    phone: phone,
    vacancyId: getAnswer(named, ['Vacancy ID', 'Vacante ID']),
    vacancyTitle: getAnswer(named, ['Vacante', 'Vacancy']),
    storeCode: getAnswer(named, ['Store Code', 'Código tienda']),
    storeName: getAnswer(named, ['Store Name', 'Tienda']),
    university: getAnswer(named, ['Universidad', 'University']),
    programType: getAnswer(named, ['Programa', 'Program Type']),
    submittedAt: new Date().toISOString(),
    sheetId: sheetId,
    sheetName: sheetName,
    rowNumber: rowNumber,
    rawAnswers: mapNamedValues(named),
  }

  var body = JSON.stringify(payload)
  var timestamp = String(Math.floor(Date.now() / 1000))
  var nonce = Utilities.getUuid()
  var message = timestamp + '.' + nonce + '.' + body
  var signature = Utilities.computeHmacSha256Signature(message, secret)
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16)
      return v.length === 1 ? '0' + v : v
    })
    .join('')

  var response = postWithRetry(endpoint, body, {
    'Content-Type': 'application/json',
    'X-ATLAS-TIMESTAMP': timestamp,
    'X-ATLAS-NONCE': nonce,
    'X-ATLAS-SIGNATURE': signature,
    'X-ATLAS-KEY': keyId,
  })

  writeAtlasLog(sheet.getParent(), {
    timestamp: new Date(),
    status: response.status,
    candidateId: response.candidateId || '',
    submissionId: response.submissionId || '',
    error: response.error || '',
  })
}

function postWithRetry(url, body, headers) {
  var attempts = 3
  var lastError = null

  for (var i = 0; i < attempts; i++) {
    try {
      var response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: body,
        headers: headers,
        muteHttpExceptions: true,
      })

      var text = response.getContentText() || '{}'
      var parsed = JSON.parse(text)

      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return {
          status: parsed.status || 'PROCESSED',
          candidateId: parsed.candidateId,
          submissionId: parsed.submissionId,
          error: '',
        }
      }

      lastError = parsed.message || 'HTTP ' + response.getResponseCode()
    } catch (err) {
      lastError = String(err)
    }

    Utilities.sleep(1000 * (i + 1))
  }

  return {
    status: 'ERROR',
    error: lastError || 'Unknown error',
  }
}

function writeAtlasLog(spreadsheet, entry) {
  var sheet = spreadsheet.getSheetByName('ATLAS_LOG')
  if (!sheet) {
    sheet = spreadsheet.insertSheet('ATLAS_LOG')
    sheet.appendRow(['timestamp', 'status', 'candidateId', 'submissionId', 'error'])
  }

  sheet.appendRow([entry.timestamp, entry.status, entry.candidateId, entry.submissionId, entry.error])
}

function getAnswer(namedValues, possibleKeys) {
  for (var i = 0; i < possibleKeys.length; i++) {
    var key = possibleKeys[i]
    if (namedValues[key] && namedValues[key][0]) return String(namedValues[key][0]).trim()
  }
  return ''
}

function mapNamedValues(namedValues) {
  var output = {}
  Object.keys(namedValues).forEach(function (k) {
    output[k] = (namedValues[k] && namedValues[k][0]) ? String(namedValues[k][0]) : ''
  })
  return output
}
