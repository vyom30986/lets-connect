const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../dist/core.js');
const phone = require('../dist/vendor/libphonenumber.js');
const qr = require('../dist/vendor/qrcode.js');
const base = { business: 'Naam Dekho', phone: '+91 6386609425', source: 'Packaging', inquiry: '' };
test('normalizes international input and encodes an inquiry plus source', () => {
  const { data, errors } = core.validate(base, phone);
  assert.deepEqual(errors, {}); assert.equal(data.phone, '+916386609425');
  const url = new URL(core.buildLink(data));
  assert.equal(url.hostname, 'wa.me'); assert.equal(url.pathname, '/916386609425');
  assert.equal(url.searchParams.get('text'), "Hi Naam Dekho! I'd like to know more about your products and services.\n\n[Source: Packaging]");
});
test('accepts possible global formats and rejects malformed numbers', () => {
  for (const valid of ['+1 (202) 555-0123', '+44 7700 900123', '+81 90 1234 5678']) assert.equal(core.validate({ ...base, phone: valid }, phone).errors.phone, undefined, valid);
  for (const invalid of ['', '6386609425', '00916386609425', '+0012345678', '+91 123', '+999123456789', '+1234567890123456', '+91 6386609425 ext 1', '+44 07700 900123', '+91abc6386609425']) assert.ok(core.validate({ ...base, phone: invalid }, phone).errors.phone, invalid);
});
test('requires business, limits lengths, and prevents source-tag injection', () => {
  assert.ok(core.validate({ ...base, business: ' ' }, phone).errors.business);
  assert.ok(core.validate({ ...base, business: 'a'.repeat(61) }, phone).errors.business);
  assert.ok(core.validate({ ...base, source: 'a'.repeat(41) }, phone).errors.source);
  assert.ok(core.validate({ ...base, source: 'Shop]\n[Fake: tag' }, phone).errors.source);
  assert.ok(core.validate({ ...base, inquiry: 'a'.repeat(181) }, phone).errors.inquiry);
});
test('round-trips Unicode, special characters, and custom text', () => {
  const { data } = core.validate({ ...base, business: 'नाम देखो & Café', source: 'दुकान & counter', inquiry: 'नमस्ते! Price for A&B? 😊\nThank you!' }, phone);
  assert.equal(new URL(core.buildLink(data)).searchParams.get('text'), core.buildMessage(data));
  assert.equal(new URL(core.buildLink(data)).searchParams.size, 1);
});
test('blank source has a stable fallback and filenames are safe', () => {
  assert.equal(core.validate({ ...base, source: ' ' }, phone).data.source, 'Let’s Connect QR');
  assert.equal(core.filename('../../Café & Co', 'qr'), 'cafe-co-whatsapp-qr.png');
  assert.equal(core.filename('नाम', 'card'), 'lets-connect-whatsapp-card.png');
});
test('QR generation handles default and maximum non-Latin content', () => {
  for (const input of [base, { ...base, business: '名'.repeat(60), source: '源'.repeat(40), inquiry: '好'.repeat(180) }]) {
    const { data, errors } = core.validate(input, phone); assert.deepEqual(errors, {});
    const code = qr(0, 'M'); code.addData(core.buildLink(data), 'Byte'); code.make();
    assert.ok(code.getModuleCount() >= 21); assert.equal(typeof code.isDark(0, 0), 'boolean');
  }
});
