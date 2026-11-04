# Review and consolidation

## Business purpose

QarWheel is presented as a Qatar-focused automotive technology platform connecting drivers, vehicles and automotive service providers. Its business website explains the product and routes two audiences: drivers exploring car care and garages exploring participation. The main web/mobile applications carry out the operational workflows.

The two supplied folders are alternative presentations of the same business, rather than distinct businesses with conflicting offerings. Both describe AI-assisted symptom guidance, garage discovery, service updates and vehicle records.

## Findings addressed

1. **A fragmented brand presentation.** Both sites used the same logo and positioning but differed in visual rhythm, deployment model and language handling. The unified package has one build, navigation, theme system and 18 localized content routes.
2. **Insufficient connection to the product.** Existing generic phone illustrations did little to show the repository's marketplace and workshop concepts. The new homepage adds a vehicle card, quick actions, category taxonomy, restrained gold AI surface, mobile tab navigation and a garage workspace with status chips.
3. **Repeated long marketing sections.** The homepage now follows a clearer sequence: audience choice, four product pillars, business proposition, interactive product explanation, everyday services, garage operations, Qatar context, FAQ and launch information.
4. **Source package state conflicts.** The inherited theme script was removed from generated pages to avoid duplicate click handlers. The new theme initialization and interaction controller work together. A desktop visual check exposed an inherited white-header override in dark mode; a scoped selector fixes it.
5. **Accessibility and resilience.** Native links/buttons/details/dialogs, focus outlines, keyboard tab selection, Escape handling, dialog focus restoration, logical spacing, reduced-motion styling, and visible content without scroll-reveal JavaScript are included.

## Design decisions

- Use the requested `#E10600` brand red; light page/surface `#F4F5F7` / `#ECEEF1`, text/border `#171717` / `#DCE0E5`; dark page/surface `#101114` / `#202228`, text/border `#F1F2F4` / `#383B43`. Emphasis text uses `#FF766C` in dark mode.
- Locally host variable Manrope for headings, Inter for body copy and Noto Sans Arabic for Arabic layouts, with the font licenses included.
- Use large editorial headings, generous whitespace and real automotive imagery. Keep translucent effects confined to navigation and a photographic annotation.
- Keep the approved logo artwork intact, with a white backing in dark contexts.
- Retain Arabic pages and RTL layouts, including direction-aware tab keyboard behavior. Do not mirror logos or photos.
- Preserve the earlier deployable project's text-only CTA preference.
- Use small, labeled product demonstrations rather than invented customer counts, ratings, discounts or testimonials.

Reference paths reviewed: `src/app/page.tsx`, `src/app/tokens.generated.css`, `mobile/app/(tabs)/index.tsx`, `mobile/lib/theme.ts`, the shared token structure, both website packages, and the deployable site's product-information source and project instructions.

Applied skill patterns: UX-021/022/029 (hierarchy, fluid layouts, narrow-screen constraints); UX-081/082/083/084 (semantics, keyboard, visible focus, dialog focus); UX-141/142/143/145 (localized copy, logical properties, RTL navigation, expanding text).

## Verification performed

- `python build.py`: generated 18 localized index pages plus the 404 page.
- `python validate.py`: verified all 19 pages, 847 local references including stylesheet/font resources, linked fragments, assets, language/direction, unique IDs, one main landmark and one H1 per page, and image alt attributes.
- `node --check source/assets/unified.js` and `theme-init.js`: JavaScript syntax checks.
- Local HTTP preview returned 200; generated HTML was served in Chrome.
- All 19 HTML routes returned HTTP 200 from the local server. The refreshed ZIP archive passed its integrity check (46 files), and the logo was verified byte-for-byte against the supplied artwork.
- Visually inspected the English desktop homepage in light and dark appearances at the available desktop browser size.
- Clicked the appearance control and verified its label changed from dark to light, and that the dark theme rendered.
- Reviewed the browser accessibility tree for navigation, experience tabs and their panel, page structure, FAQ disclosures and localized route destinations.

## November 4 follow-up

The premium typography, exact palette and floating glass capsule were visually reviewed in Chrome in both desktop themes. The English homepage and product section were inspected at a 320 CSS-pixel responsive viewport. Arabic Noto Sans text, RTL ordering and the homepage were inspected at the same width.

The product selector changed from Understand to Discover on click and from Discover to Follow using the keyboard. The floating header remained available while navigating to the experience section. The mobile menu opened through a simulated tap. Its original translucent dropdown let underlying text show through, so the dropdown now uses a stronger tint. The corrected Arabic menu was visually rechecked in both light and dark themes. The phone illustration's avatar also now keeps its light appearance in either website theme.

Styles and scripts use content-hashed URLs after a stale browser stylesheet was observed during iteration. `python build.py --package` now builds and refreshes the deployment archive in one command. All fonts are bundled; no visitor request to Google Fonts is required.

Entrance sequences, section reveals, tab changes, FAQ content and hover feedback use short animations; the mobile menu uses a brief entrance. Pointer-driven depth is limited to precise pointers. CSS and JavaScript both handle reduced motion, including preference changes while the page is open. Content is visible without the animation script.

The console messages observed during the review came from a Zotero Chrome extension, rather than the website's scripts. Browser automation stopped during the final attempt to return to the desktop preview because it could no longer verify Chrome's current URL; no further browser input was attempted.

Visual coverage is limited to the homepage, product selector and responsive menu, rather than every inner page. Full keyboard traversal, dialog operation, screen-reader testing, reduced-motion emulation and contrast scanning remain unverified. No WCAG conformance claim is made.

The link validator checks file/fragment integrity, not public availability or backend behavior. Contact/legal/store-link and photo-rights prerequisites are documented in README.md and ASSETS.md.
