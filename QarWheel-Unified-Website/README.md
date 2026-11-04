# QarWheel — unified business website

One bilingual business profile combining the two supplied website packages, with design concepts grounded in the main web and mobile applications. The original folders and application code have not been changed.

## Preview and deployment

The ready-to-upload site is in `website/`, also packaged as `QarWheel-Unified-Shared-Hosting.zip`. Upload **the website folder's contents or extract the ZIP** into your hosting document root, such as `public_html`. There is no Node runtime, database, Firebase configuration, API key or dependency installation required. All images, styles and scripts are local. English and Arabic pages are pre-rendered and work on conventional shared hosting.

For a local preview from this directory:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory website
```

Open `http://127.0.0.1:4173/`. Arabic starts at `/ar/`. The package also supports serving from a subdirectory because internal destinations are relative. Canonical URLs and the sitemap currently use the inherited `https://qarwheel.qa/` domain; update them if deploying elsewhere. Configure the host to use `404.html` as its error document.

## Edit and rebuild

```powershell
python build.py
python validate.py
node --check source/assets/unified.js
```

Python 3.10+ is sufficient for building and validating; Node is only used for the optional JavaScript syntax check.

- `source/home.py`: English/Arabic homepage, mobile illustration, interactive product stories, service categories and business workspace.
- `source/assets/unified.css`: new visual system, shared page refinements, dark theme, responsive and RTL behavior.
- `source/assets/unified.js`: accessible navigation, dialog, product/journey tabs and theme persistence.
- `source/assets/theme-init.js`: applies the saved theme before first paint.
- `source/templates/`: editable bilingual inner-page copy and shared footer/dialog content inherited from the refined package. Homepage body content is replaced by `home.py` at build time; its original FAQ, Qatar banner and launch section are retained.
- `source/assets/site.css`: retained styles for existing inner-page components. New styles are applied in `unified.css`.
- `website/`: generated deployment output; edit source files and rebuild instead of editing these files directly.

## What was unified

| Source | Retained or adapted |
| --- | --- |
| Deployable website | Editorial product storytelling, separate driver/garage journeys, restrained glass, mobile product compositions, service categories, bilingual explanatory copy, exact logo and text-only CTAs |
| Refined shared-hosting website | Dedicated English/Arabic routes, inner-page content, SEO metadata, FAQs, keyboard-friendly journey interaction, local optimized image assets, static hosting |
| Main application | Red/warm-neutral brand palette, service taxonomy, vehicle records, AI guidance, service progress and garage workflow concepts |
| Mobile application | Shared theme colors and rounded surfaces, vehicle card, compact quick actions, gold AI cue, category icons, bottom navigation and status chips |

The product screens are illustrative HTML compositions, not live app screenshots. They contain no real bookings, providers, ratings, prices or customer data. The business website does not implement the main app's authentication or booking backend.

## Before public launch

The source packages have unresolved business content. This merge preserves those facts:

- Official App Store / Google Play URLs and release availability remain unconfirmed. Launch controls explain this; they do not send visitors to unofficial listings.
- Verified contact channels and partnership terms have not been provided. Contact pages retain the availability notice; there is no form pretending to submit an enquiry.
- Privacy and terms pages remain draft/pending content and require approved copy.
- The workshop and Doha photographs have unconfirmed publication rights. See `ASSETS.md`; clear or replace these reference assets before publication.

No external publication was performed. See `DESIGN-REVIEW.md` for the design rationale and actual verification coverage.
