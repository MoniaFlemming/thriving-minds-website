# Branded QR system — locked until the official domain is live

No permanent QR code has been generated. Never use a temporary Replit development URL.

## Required order

1. Approve the website and the technical launch report.
2. Publish the web and API artifacts together.
3. Connect `thrivingmindsconsulting.com` using the exact records shown in Replit's domain settings. Do not guess GoDaddy records or remove any existing MX, SPF, DKIM, DMARC or other email-related records.
4. Verify HTTPS, the homepage, public legal pages, saved inquiry flow and delivery to/from `info@thrivingmindsconsulting.com`. A `mailto:` link is not proof that a mailbox works.
5. Set up Search Console and submit the sitemap; configure a real GA4 ID and verify consent-controlled realtime events if desired.
6. Only after those checks, run the local generator:

```sh
node scripts/src/create-brand-qr.mjs --confirm-domain-live --confirm-email-working
```

The generator checks the official HTTPS site, prepared canonical metadata and API availability. It refuses to write QR files without both operator confirmations. The local `qrencode` CLI is installed; no external QR service, subscription, shortener or expiring QR redirect is involved.

## Variants

The same stable homepage destination can support business cards, flyers, community presentations and social media. Change the filename/print-purpose without changing the official destination:

```sh
node scripts/src/create-brand-qr.mjs --confirm-domain-live --confirm-email-working --purpose business-card
node scripts/src/create-brand-qr.mjs --confirm-domain-live --confirm-email-working --purpose booking --path '/#book-now'
node scripts/src/create-brand-qr.mjs --confirm-domain-live --confirm-email-working --purpose family-resources --path '/#resources'
```

Files are placed in `attached_assets/launch-qr/<purpose>/`: SVG for print, PNG for general use, a self-contained print card with the unaltered official logo and the requested “SCAN. CONNECT. TAKE YOUR NEXT STEP.” caption, and a verification note.

## Print verification

- Keep the four-module white quiet zone, high-contrast plum-on-white modules, and unaltered proportions.
- Do not put the logo inside the code or crop away the white space.
- The print card uses a 65 mm code. Avoid reducing the code below 25 mm; choose larger sizes for flyers viewed from a distance.
- Test the digital image and a printed sample on multiple phones, including Android and iPhone where available. Confirm the exact destination and contact flow.
- Smartphone scanning and mailbox delivery have **not** been tested in this workspace. Record those checks before printing or distribution.