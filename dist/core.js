/* Pure helpers shared by the browser and the verification suite. */
(function (root) {
  'use strict';
  const limits = { business: 60, source: 40, inquiry: 180 };
  function defaultInquiry(business) {
    return `Hi ${business || 'Your business'}! I'd like to know more about your products and services.`;
  }
  function validate(values, phoneLibrary) {
    const data = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).trim()]));
    const errors = {};
    if (!data.business) errors.business = 'Enter your business name.';
    if (data.business.length > limits.business) errors.business = 'Keep your business name to 60 characters.';
    if (/[\u0000-\u001f\u007f]/.test(data.business)) errors.business = 'Use a single line for your business name.';
    if (!data.phone) errors.phone = 'Enter your WhatsApp number, including + and country code.';
    else if (!/^\+[1-9][\d ()-]*$/.test(data.phone)) errors.phone = 'Start with + and a country code, for example +91 63866 09425. No letters or extensions.';
    else {
      const digits = data.phone.replace(/\D/g, '');
      const parsed = phoneLibrary.parsePhoneNumberFromString('+' + digits, { extract: false });
      if (digits.length > 15 || !parsed || !parsed.isPossible()) errors.phone = 'Check the country code and number length. This is not a possible international number.';
      else if (parsed.number !== '+' + digits) errors.phone = 'Remove the local leading zero after the country code.';
      else data.phone = parsed.number;
    }
    if (data.source.length > limits.source || /[\r\n\[\]\u0000-\u001f\u007f]/.test(data.source)) errors.source = 'Use up to 40 characters without line breaks or square brackets.';
    if (data.inquiry.length > limits.inquiry) errors.inquiry = 'Keep your inquiry to 180 characters.';
    data.source = data.source || 'Let’s Connect QR';
    data.inquiry = data.inquiry || defaultInquiry(data.business);
    return { data, errors };
  }
  function buildMessage(data) { return `${data.inquiry}\n\n[Source: ${data.source}]`; }
  function buildLink(data) { return `https://wa.me/${data.phone.replace(/\D/g, '')}?text=${encodeURIComponent(buildMessage(data))}`; }
  function filename(name, format) {
    return `${name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'lets-connect'}-whatsapp-${format}.png`;
  }
  const api = { validate, defaultInquiry, buildMessage, buildLink, filename };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConnectCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
