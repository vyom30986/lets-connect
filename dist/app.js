(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['business', 'phone', 'source', 'inquiry'];
  const form = $('qr-form');
  let generated = null;
  let revision = 0;
  let busy = false;
  function values() { return Object.fromEntries(fields.map(id => [id, $(id).value])); }
  function enableActions(enabled) {
    $('download').disabled = !enabled || busy;
    $('copy').disabled = !enabled;
    $('test-link').setAttribute('aria-disabled', String(!enabled));
    if (enabled) { $('test-link').href = generated.url; $('test-link').removeAttribute('tabindex'); }
    else { $('test-link').removeAttribute('href'); $('test-link').tabIndex = -1; }
  }
  function clearErrors() {
    fields.forEach(id => { $(id).removeAttribute('aria-invalid'); $(id + '-error').textContent = ''; });
  }
  function refreshDraft() {
    const business = $('business').value.trim();
    const source = $('source').value.trim() || 'Let’s Connect QR';
    $('inquiry').placeholder = ConnectCore.defaultInquiry(business || 'Naam Dekho');
    $('message-text').textContent = $('inquiry').value.trim() || ConnectCore.defaultInquiry(business);
    $('message-source').textContent = `[Source: ${source}]`;
    document.querySelectorAll('[data-source]').forEach(button => {
      const selected = button.dataset.source === $('source').value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function invalidate() {
    revision++;
    if (generated) {
      generated = null;
      $('qr-canvas').hidden = true;
      $('qr-placeholder').hidden = false;
      $('preview-status').textContent = 'Update needed';
      $('form-status').textContent = 'Details changed. Generate again to update your QR code.';
    }
    $('card-business').textContent = $('business').value.trim() || 'Your business, here.';
    enableActions(false);
    $('download-status').textContent = 'High-resolution PNG · No watermark on QR-only exports';
    refreshDraft();
  }
  // Integer-sized modules and a four-module quiet zone keep exported codes sharp.
  function drawQR(canvas, qr, target = 1200) {
    const count = qr.getModuleCount(), unit = Math.floor(target / (count + 8));
    canvas.width = canvas.height = target;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, target, target);
    const start = Math.floor((target - count * unit) / 2);
    ctx.fillStyle = '#173d32';
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) ctx.fillRect(start + col * unit, start + row * unit, unit, unit);
    }
  }
  function generate(event) {
    event?.preventDefault();
    clearErrors();
    if (!window.qrcode || !window.libphonenumber) {
      $('form-status').textContent = 'The QR tools could not load. Reload this page and try again.';
      return;
    }
    const { data, errors } = ConnectCore.validate(values(), window.libphonenumber);
    if (Object.keys(errors).length) {
      generated = null; enableActions(false);
      $('qr-canvas').hidden = true; $('qr-placeholder').hidden = false;
      Object.entries(errors).forEach(([id, message]) => { $(id).setAttribute('aria-invalid', 'true'); $(id + '-error').textContent = message; });
      if (errors.inquiry) $('inquiry').closest('details').open = true;
      $(Object.keys(errors)[0]).focus();
      $('preview-status').textContent = 'Check details';
      $('form-status').textContent = 'Check the highlighted fields to create your QR.';
      return;
    }
    try {
      const url = ConnectCore.buildLink(data);
      const qr = qrcode(0, 'M');
      // The entire URL is ASCII: encodeURIComponent preserves non-Latin messages.
      qr.addData(url, 'Byte'); qr.make();
      drawQR($('qr-canvas'), qr);
      generated = { data, url, qr };
      revision++;
      $('qr-canvas').hidden = false; $('qr-placeholder').hidden = true;
      $('qr-canvas').setAttribute('aria-label', `WhatsApp QR code for ${data.business}`);
      $('card-business').textContent = data.business;
      $('preview-status').textContent = 'Ready to share';
      $('form-status').textContent = 'Your QR is ready. Test the link or scan before printing.';
      enableActions(true);
      $('download-status').textContent = 'Choose your format and download your PNG.';
      refreshDraft();
    } catch (error) {
      generated = null; enableActions(false);
      $('qr-canvas').hidden = true; $('qr-placeholder').hidden = false;
      $('preview-status').textContent = 'Try again';
      $('form-status').textContent = 'Could not generate the QR. Try a shorter message and source tag.';
    }
  }
  function wrapText(ctx, text, width) {
    const lines = []; let line = '';
    // Character-aware wrapping also supports long unbroken names and non-Latin scripts.
    for (const char of Array.from(text)) {
      if (ctx.measureText(line + char).width > width && line) { lines.push(line.trim()); line = char; }
      else line += char;
    }
    if (line) lines.push(line.trim());
    return lines;
  }
  function renderCard(snapshot) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffef9'; ctx.fillRect(0, 0, 1200, 1500);
    ctx.textAlign = 'center'; ctx.fillStyle = '#71845b';
    ctx.font = '22px Arial'; ctx.fillText('A SCAN AWAY FROM HELLO', 600, 95);
    let size = 86, lines;
    do { ctx.font = `${size}px Georgia`; lines = wrapText(ctx, snapshot.data.business, 1000); if (lines.length <= 2) break; size -= 2; } while (size >= 32);
    ctx.fillStyle = '#173d32';
    lines.forEach((line, index) => ctx.fillText(line, 600, 220 - (lines.length - 1) * size / 2 + index * (size + 8)));
    ctx.font = '27px Arial'; ctx.fillStyle = '#73816a'; ctx.fillText('Good conversations start here.', 600, 327);
    const qrCanvas = document.createElement('canvas');
    drawQR(qrCanvas, snapshot.qr, 900);
    ctx.drawImage(qrCanvas, 150, 375);
    ctx.fillStyle = '#173d32'; ctx.font = 'bold 35px Arial'; ctx.fillText('Scan to chat on WhatsApp', 600, 1325);
    ctx.fillStyle = '#73816a'; ctx.font = '24px Arial'; ctx.fillText('Scan. Say hello. Tap Send.', 600, 1375);
    ctx.strokeStyle = '#d8ddcd'; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.moveTo(120, 1415); ctx.lineTo(1080, 1415); ctx.stroke();
    ctx.font = '21px Arial'; ctx.fillText('Made with let’s connect.', 600, 1460);
    return canvas;
  }
  async function download() {
    if (!generated || busy) return;
    const snapshot = generated, currentRevision = revision;
    const format = document.querySelector('[name="format"]:checked').value;
    busy = true; enableActions(true);
    try {
      const canvas = format === 'card' ? renderCard(snapshot) : document.createElement('canvas');
      if (format === 'qr') drawQR(canvas, snapshot.qr);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG creation failed');
      if (currentRevision !== revision) return;
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = ConnectCore.filename(snapshot.data.business, format);
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      $('download-status').textContent = `${format === 'card' ? '1200 × 1500' : '1200 × 1200'} PNG download started. Scan-test your printed copy.`;
    } catch {
      $('download-status').textContent = 'Download failed. Please try again in a current browser.';
    } finally { busy = false; enableActions(Boolean(generated)); }
  }
  async function copyLink() {
    if (!generated) return;
    const url = generated.url;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const text = document.createElement('textarea'); text.value = url;
        text.style.cssText = 'position:fixed;left:-9999px'; document.body.append(text); text.select();
        const success = document.execCommand('copy'); text.remove(); $('copy').focus();
        if (!success) throw new Error('Clipboard unavailable');
      }
      $('download-status').textContent = 'WhatsApp link copied.';
    } catch { $('download-status').textContent = 'Copy unavailable. Use Test link, or copy its address from the link menu.'; }
  }
  form.addEventListener('submit', generate);
  fields.forEach(id => $(id).addEventListener('input', () => { $(id).removeAttribute('aria-invalid'); $(id + '-error').textContent = ''; invalidate(); }));
  document.querySelectorAll('[data-source]').forEach(button => button.addEventListener('click', () => { $('source').value = button.dataset.source; $('source').removeAttribute('aria-invalid'); $('source-error').textContent = ''; invalidate(); }));
  $('example').addEventListener('click', () => {
    $('business').value = 'Naam Dekho'; $('phone').value = '+91 6386609425'; $('source').value = 'Packaging'; $('inquiry').value = '';
    invalidate(); generate(); $('form-status').textContent = 'Example generated for Naam Dekho (+91). Replace these details with your own before sharing.';
  });
  $('download').addEventListener('click', download);
  $('copy').addEventListener('click', copyLink);
  $('test-link').addEventListener('click', event => { if (!generated) event.preventDefault(); });
  enableActions(false); refreshDraft();
})();
