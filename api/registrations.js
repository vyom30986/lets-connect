'use strict';
const core = require('../dist/core.js');
const phones = require('../dist/vendor/libphonenumber.js');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ok:false}); }
  const origin = process.env.ALLOWED_ORIGIN || 'https://lets-connect-pi.vercel.app';
  if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ok:false});
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ok:false});
  let input;
  try {
    if (Number(req.headers['content-length']) > 4096) return res.status(413).json({ok:false});
    input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!input || Array.isArray(input) || JSON.stringify(input).length > 4096) return res.status(400).json({ok:false});
    if (!['business','phone','source','eventId'].every(key => typeof input[key] === 'string') || !UUID.test(input.eventId)) return res.status(400).json({ok:false});
  } catch { return res.status(400).json({ok:false}); }
  const {data,errors} = core.validate({business:input.business,phone:input.phone,source:input.source,inquiry:''}, phones);
  if (Object.keys(errors).length) return res.status(400).json({ok:false});
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) || !secret || secret.length < 32) return res.status(503).json({ok:false});
  try {
    const response = await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json'}, redirect:'follow',
      body:JSON.stringify({business:data.business,phone:data.phone,source:data.source,eventId:input.eventId,secret}),
      signal:AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true || result.eventId !== input.eventId) throw new Error('Save not confirmed');
    return res.status(200).json({ok:true,eventId:input.eventId});
  } catch { return res.status(502).json({ok:false}); }
};
