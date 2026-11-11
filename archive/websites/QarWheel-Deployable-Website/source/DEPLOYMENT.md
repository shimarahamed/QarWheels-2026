# QarWheel website — deployment package

This ZIP contains a static React/Vite marketing website, with English and Arabic (RTL), light and dark themes, and navigation arrows removed. It includes the original approved logo and the existing rounded, glass-accented design.

## Fastest deployment

1. Unzip the archive.
2. Upload **the contents of `website/`** to your hosting web root (`public_html` for typical cPanel hosting), or select `website/` as a static host's upload directory.
3. Open your domain. The site requires no database, API keys or application server.

The folder contains compiled JavaScript, CSS, photographs and pre-rendered pages. `index.html` must sit at the domain root, alongside `assets/` and the page directories. Serve over HTTP(S); double-clicking index.html is not a reliable preview. This build assumes deployment at a domain root, not a subdirectory.

English routes include `/product/`, `/drivers/`, `/garages/`, `/how-it-works/`, `/about/`, `/contact/`, `/privacy/` and `/terms/`. Arabic is selected by `?lang=ar` and the language switch. In this portable static export, Arabic is rendered by JavaScript; the Sites-specific worker is not required. Theme preference is stored locally in the visitor's browser.

## Edit and rebuild

The `source/` directory contains the editable project, excluding credentials, repository metadata, dependencies and Sites account identity.

Use a supported Node.js version compatible with Vite 6 (Node 22 recommended):

```sh
cd source
npm ci
npm run dev
```

For a portable production build:

```sh
npm run build:static
```

Deploy the contents of `dist-static/`. The source also retains its original Sites worker/build scripts for reference, but the portable build deliberately does not need a Sites manifest. `npm run build` is the original Sites-specific command and requires its hosting configuration.

## Content to configure before a public launch

- Add verified official QarWheel App Store and Google Play URLs in `src/app-links.js`. No store destinations or app availability have been invented. Update download-availability copy in `src/content.js` when listings are confirmed.
- Replace pending contact details and approved privacy/terms copy in `src/content.js`.
- Review `ASSETS.md`: workshop and Doha photography are reference assets with unconfirmed publication rights. Replace them with owned/licensed images before public launch. Product screens are illustrative.
- The build and static export are validated. Visual browser QA is not complete because the managed preview service was unavailable.

## Files to edit

- `src/App.jsx`: pages, navigation and product compositions.
- `src/content.js`: primary English and Arabic copy.
- `src/AppInformation.jsx`: additional app information, FAQs and store-link presentation.
- `src/styles.css`, `src/refresh.css`, `src/export-refinements.css`: responsive styling and themes.
- `src/app-links.js`: official app download URLs.
- `public/assets/`: logo and photography.

No login, booking backend, customer dashboard or payment system is included.
