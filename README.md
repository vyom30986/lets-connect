# Let’s Connect

A responsive, single-page WhatsApp QR generator. Plain HTML, CSS, and JavaScript, with all runtime libraries included. No build step, API keys, database, account, or package installation is required.

## Use

Open `dist/index.html` in a current browser, or run `npm start` (Node 18+) and open `http://127.0.0.1:4173`.

1. Enter a business name and WhatsApp phone number starting with `+` and the country code.
2. Choose a source (Packaging, Store counter, Business card, or your own label).
3. Optionally personalize the inquiry, then generate.
4. Preview the QR and message, test the WhatsApp link, and download a PNG.

Exports: print-ready business card (1200 × 1500 px) or QR only (1200 × 1200 px). The preview uses the same QR data as the export. Layout spacing is adapted for the large printable card. QR-only exports have no branding.

The example uses Naam Dekho and `+91 6386609425`, interpreting the original number as an Indian business example. It does not verify the account or send any message. The form starts blank so businesses enter their own details.

## Deploy

### Vercel

Import `vyom30986/lets-connect` in Vercel. Keep the repository root as the root directory. The included `vercel.json` selects the Other preset, runs `npm test` before publishing, and serves `dist/`. No environment variables are required. Connect the `main` branch for production deployments on each push.

Configuration reference: [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).

### Other static hosts

The `lets-connect-deploy.zip` archive contains the contents of `dist/` at its root. Extract and upload those files to any static web host. The web root must contain `index.html`, `styles.css`, `core.js`, `app.js`, `icon.svg`, and `vendor/`.

For a repository-based static host, use **no build command** and set the **publish/output directory to `dist`**. For GitHub Pages, publish the contents of `dist/` from your Pages branch or via an artifact workflow. Relative asset paths also support subdirectory hosting.

Hosting credentials and local hosting metadata are excluded from the repository. No secrets are required or included.

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

Generation and PNG creation happen in the browser without requests to a QR service. No form data is stored by this application. A hosted service may have its own request logs and access controls. Opening a WhatsApp link shares its number and message with WhatsApp. The QR itself contains the business number and message and should be treated as public contact information.

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

Browser visual QA and real-device WhatsApp behavior remain unverified: the local preview connection was unavailable and the in-app browser disallowed direct local-file navigation. Responsive breakpoints are implemented for mobile, tablet, and desktop. Before public launch, review the page on your target devices and scan a printed sample. No test messages were sent.
