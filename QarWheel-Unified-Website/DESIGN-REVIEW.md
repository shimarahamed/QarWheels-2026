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

- Use the repository's warm `#F7F3F1` background, dark `#11161D` surfaces and QarWheel red family. Action red is darkened for readable white button labels; dark-mode accents are lightened.
- Use large editorial headings, generous whitespace and real automotive imagery. Keep translucent effects confined to navigation and a photographic annotation.
- Keep the approved logo artwork intact, with a white backing in dark contexts.
- Retain Arabic pages and RTL layouts, including direction-aware tab keyboard behavior. Do not mirror logos or photos.
- Preserve the earlier deployable project's text-only CTA preference.
- Use small, labeled product demonstrations rather than invented customer counts, ratings, discounts or testimonials.

Reference paths reviewed: `src/app/page.tsx`, `src/app/tokens.generated.css`, `mobile/app/(tabs)/index.tsx`, `mobile/lib/theme.ts`, the shared token structure, both website packages, and the deployable site's product-information source and project instructions.

Applied skill patterns: UX-021/022/029 (hierarchy, fluid layouts, narrow-screen constraints); UX-081/082/083/084 (semantics, keyboard, visible focus, dialog focus); UX-141/142/143/145 (localized copy, logical properties, RTL navigation, expanding text).

## Verification performed

- `python build.py`: generated 18 localized index pages plus the 404 page.
- `python validate.py`: verified all 19 pages, 776 local references, linked fragments, assets, language/direction, unique IDs, one main landmark and one H1 per page, and image alt attributes.
- `node --check source/assets/unified.js` and `theme-init.js`: JavaScript syntax checks.
- Local HTTP preview returned 200; generated HTML was served in Chrome.
- All 19 HTML routes returned HTTP 200 from the local server. The ZIP archive passed its integrity check (37 files), and the logo was verified byte-for-byte against the supplied artwork.
- Visually inspected the English desktop homepage in light and dark appearances at the available desktop browser size.
- Clicked the appearance control and verified its label changed from dark to light, and that the dark theme rendered.
- Reviewed the browser accessibility tree for navigation, experience tabs and their panel, page structure, FAQ disclosures and localized route destinations.

Browser automation then stopped because it could no longer determine the current Chrome URL confidently. No further browser automation was attempted. The CSS correction made after observing the dark-header conflict was checked in source, but could not be visually rechecked. Mobile/tablet rendering, Arabic visual QA, keyboard interaction through the full site, dialog operation, tab interaction, screen-reader testing, reduced-motion emulation and contrast scanning remain unverified. No WCAG conformance claim is made.

The link validator checks file/fragment integrity, not public availability or backend behavior. Contact/legal/store-link and photo-rights prerequisites are documented in README.md and ASSETS.md.
