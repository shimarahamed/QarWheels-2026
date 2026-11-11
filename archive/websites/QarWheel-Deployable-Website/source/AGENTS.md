# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## QarWheel feedback and constraints
User rejected all generated website concepts as AI-looking. Build a real corporate automotive website with editorial typography and real photographic source assets. Preserve uploaded logo artwork. English and Arabic RTL are required. Do not invent contacts, app links, social proof or partnerships. Prototype photographs with unconfirmed publication rights need replacing or clearing before public launch. App interfaces are explicitly illustrative.

## September 20 design revision
User explicitly requests a mix of light and dark, rounded corners, liquid glass and a more current, conversion-focused visual direction. This supersedes the original prohibition on glassmorphism and rounded treatments. Preserve the exact approved logo and bilingual content. Apply optical glass to navigation, photo overlays, tabs and mobile download affordances; keep long-form text on solid surfaces. Use a split light-copy/dark-product hero, layered app preview and rounded alternating sections. Do not imply measured conversion improvements or app-store availability.

## October 29 export revision
User requests all directional arrows removed and a deployable ZIP. Remove arrow glyphs from navigation, calls to action, app illustrations and steps while retaining functional text links. Include compiled portable static files and editable source with deployment instructions. Complete the previously requested persistent dark/light theme and additional bilingual app information. Official app links remain unverified placeholders. Preserve approved brand artwork.

User reconfirms text-only buttons/CTAs on the hosted website. Secondary CTAs use plain pill buttons without directional or external-link icons; remove legacy arrow CSS. Keep destinations and navigation functional in both languages and themes.
