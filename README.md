# Let’s Connect

A responsive, single-page WhatsApp QR generator. Plain HTML, CSS, and JavaScript, with all runtime libraries included. QR rendering runs locally; registrations are saved through a Vercel function and a private Google Sheet.

## Use

Use the deployed Vercel site for registrations. Run `npm start` for a static UI preview; the example works locally, while real registration requires the configured backend.

1. Enter a business name and WhatsApp phone number starting with `+` and the country code.
2. Choose a source (Packaging, Store counter, Business card, or your own label).
3. Optionally personalize the inquiry, then generate.
4. Preview the QR and message, test the WhatsApp link, and download a PNG.

Exports: print-ready business card (1200 × 1500 px) or QR only (1200 × 1200 px). The preview uses the same QR data as the export. Layout spacing is adapted for the large printable card. QR-only exports have no branding.

The example uses Naam Dekho and `+91 6386609425`, interpreting the original number as an Indian business example. It does not verify the account or send any message. The form starts blank so businesses enter their own details.

## Deploy

### Vercel

Import `vyom30986/lets-connect` in Vercel. Keep the repository root as the root directory. The included `vercel.json` selects the Other preset, runs `npm test` before publishing, and serves `dist/`. Set the backend environment variables described below. Connect the `main` branch for production deployments on each push.

Configuration reference: [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).

### Google Sheets connection

1. Create a private sheet with a `Registrations` tab and headers: Created at (IST), Business name, WhatsApp number, QR source, Registration ID.
2. Paste `google-apps-script/Code.gs` into your own Google Apps Script project.
3. In Script Properties, set `SHEET_ID` to that spreadsheet ID and `WEBHOOK_SECRET` to a cryptographically random secret of at least 32 characters.
4. Authorize the script and deploy a web app executing as you, accessible to Anyone. The endpoint rejects requests without the shared secret and never exposes spreadsheet rows. Keep the sheet itself private.
5. In Vercel Production environment variables, set `GOOGLE_SHEETS_WEBHOOK_URL` to the deployed `/exec` URL and `GOOGLE_SHEETS_WEBHOOK_SECRET` to the matching secret. Set `ALLOWED_ORIGIN` if using a domain other than `https://lets-connect-pi.vercel.app`.
6. Redeploy and verify a registration reaches the sheet. Deploy a new Apps Script version whenever its source changes.

Both ZIP packages contain the complete Vercel project including the backend. Static-only hosting does not support registrations. Preview deployments deliberately cannot write to the production sheet unless their origin is explicitly configured.

A failed save keeps downloads disabled and offers a retry. Retries use the same registration ID; the receiver locks writes and suppresses duplicate IDs. Spreadsheet values are written as literal text to prevent formula injection. The inquiry stays local. Browser origins are checked, but this is a public registration form, not identity verification or robust bot protection. Vercel and Google quotas still apply. Use Vercel firewall/rate limits if abuse develops, and restrict spreadsheet sharing to intended administrators.
## How WhatsApp works

The code encodes `https://wa.me/<international-digits>?text=<URL-encoded-message>`.

Default message:

```text
Hi Naam Dekho! I'd like to know more about your products and services.

[Source: Packaging]
```

WhatsApp opens the conversation with this message prefilled. **The customer must review it and tap Send. Nothing is sent automatically.** The customer can change or remove the message and source tag. The source is visible message text, not scan analytics or verified attribution. There are no notifications until the customer actually sends their message.

The destination number must have an active WhatsApp account. WhatsApp or WhatsApp Web may require installation or sign-in. The application checks number syntax, recognized calling codes, and possible length; it cannot confirm ownership or WhatsApp registration. Country metadata can change, so keep the bundled phone library maintained. Possible-number validation intentionally avoids rejecting newly allocated number ranges based on older type metadata.

Reference: [WhatsApp’s official click-to-chat instructions](https://faq.whatsapp.com/5913398998672934).

## Privacy and printing

Generation and PNG creation happen in the browser without requests to a QR service. The operator stores business name, normalized WhatsApp number, source tag, creation time in IST, and a random registration ID in a private Google Sheet. Custom inquiries are not sent to this backend. Registrations are saved before the QR is made available. The example is not logged. No scan or WhatsApp-message tracking is performed. A hosted service may have its own request logs and access controls. Opening a WhatsApp link shares its number and message with WhatsApp. The QR itself contains the business number and message and should be treated as public contact information.

QRs use medium error correction, dark green modules on white, integer-pixel module sizing, and at least a four-module quiet zone. Short messages produce less dense codes. Preserve the white border, avoid stretching or placing artwork on the code, and test an actual printed sample at its final size on multiple phones. Static QR codes have no expiry set by this tool, but the destination must stay active; printed codes cannot be remotely edited.

## Source and checks

- `dist/index.html` — page content and accessible form
- `dist/styles.css` — responsive layout and styling
- `dist/core.js` — validation, message, link, and filename helpers
- `dist/app.js` — preview, stale-code protection, PNG exports, copy-link behavior
- `dist/vendor/` — self-hosted dependencies and licenses
- `serve.cjs` — dependency-free local preview server
- `tests/core.test.cjs` — number validation, message round-trip, Unicode, source injection, filename and QR capacity tests

Run `npm test`. No package installation is needed. The code uses textContent for business-provided text and URL-encodes the complete inquiry; it does not render user input as HTML. Editing any QR field clears the old QR and disables its download until regeneration.

Limits: business name 60 characters, source 40 characters, custom inquiry 180 characters. Empty source becomes “Let’s Connect QR”. Source tags cannot contain square brackets or line breaks. The custom-inquiry cap keeps worst-case non-Latin messages within QR capacity.

Bundled libraries: qrcode-generator 1.4.4 (MIT, Kazuhiko Arase) and libphonenumber-js 1.11.20 (MIT, Nikolay Kuchumov). Original notices are preserved in `dist/vendor/`.

## Verification performed

All six included automated tests pass. Additional DOM-and-canvas checks exercised the actual application code for invalid forms, example generation, copying links, stale-QR protection, Unicode, and both export formats. The resulting 1200 × 1500 and 1200 × 1200 PNGs were independently decoded with jsQR and matched the expected WhatsApp URL. The print-card image was visually inspected. These checks used a DOM/canvas test harness, not an interactive browser.

The original deployment passed desktop and mobile browser checks, including an actual PNG download. Real-device WhatsApp behavior remains unverified. Responsive breakpoints are implemented for mobile, tablet, and desktop. Before public launch, review the page on your target devices and scan a printed sample. No test messages were sent.

