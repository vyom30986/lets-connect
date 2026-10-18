// Deploy as a web app executing as the owner. Keep the spreadsheet private.
// Set SHEET_ID and WEBHOOK_SECRET in Script Properties before deployment.
function doPost(e) {
  const reply = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('WEBHOOK_SECRET');
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 4096) return reply({ok:false});
    const data = JSON.parse(raw);
    if (!secret || secret.length < 32 || data.secret !== secret) return reply({ok:false});
    if (typeof data.business !== 'string' || !data.business.trim() || data.business.length > 60 || /[\u0000-\u001f\u007f]/.test(data.business)) return reply({ok:false});
    if (typeof data.phone !== 'string' || !/^\+[1-9]\d{6,14}$/.test(data.phone)) return reply({ok:false});
    if (typeof data.source !== 'string' || data.source.length > 40 || /[\[\]\u0000-\u001f\u007f]/.test(data.source)) return reply({ok:false});
    if (typeof data.eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.eventId)) return reply({ok:false});
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply({ok:false});
    const book = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    const sheet = book.getSheetByName('Registrations');
    if (!sheet) return reply({ok:false});
    const lastRow = sheet.getLastRow();
    if (lastRow > 1 && sheet.getRange(2,5,lastRow-1,1).createTextFinder(data.eventId).matchEntireCell(true).findNext()) return reply({ok:true,eventId:data.eventId});
    // Leading apostrophes force literal text, including +phones and =formula input.
    const literal = value => "'" + value;
    const row = lastRow + 1;
    sheet.getRange(row,1,1,5).setNumberFormat('@').setValues([[
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
      literal(data.business.trim()), literal(data.phone), literal(data.source), data.eventId
    ]]);
    SpreadsheetApp.flush();
    return reply({ok:true,eventId:data.eventId});
  } catch (_) {
    return reply({ok:false});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

// Used only to approve spreadsheet access before deploying. Does not add test rows.
function verifySetup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('WEBHOOK_SECRET') || props.getProperty('WEBHOOK_SECRET').length < 32) throw new Error('Set WEBHOOK_SECRET first.');
  const book = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  if (!book.getSheetByName('Registrations')) throw new Error('Registrations tab is missing.');
  console.log('Registration destination is ready.');
}
