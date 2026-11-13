---
name: Cockpit Precision
colors:
  surface: '#101418'
  surface-dim: '#101418'
  surface-bright: '#36393e'
  surface-container-lowest: '#0b0e13'
  surface-container-low: '#191c20'
  surface-container: '#1d2024'
  surface-container-high: '#272a2f'
  surface-container-highest: '#32353a'
  on-surface: '#e0e2e8'
  on-surface-variant: '#e7bdb8'
  inverse-surface: '#e0e2e8'
  inverse-on-surface: '#2d3135'
  outline: '#ae8883'
  outline-variant: '#5d3f3c'
  surface-tint: '#ffb4ab'
  primary: '#ffb4ab'
  on-primary: '#690006'
  primary-container: '#e31e24'
  on-primary-container: '#fffafa'
  inverse-primary: '#c00014'
  secondary: '#ffb3af'
  on-secondary: '#68000d'
  secondary-container: '#92131e'
  on-secondary-container: '#ff9e99'
  tertiary: '#e9c349'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cca730'
  on-tertiary-container: '#4f3d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3af'
  on-secondary-fixed: '#410005'
  on-secondary-fixed-variant: '#8e101c'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#101418'
  on-background: '#e0e2e8'
  surface-variant: '#32353a'
typography:
  display-xl:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-xl-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '900'
    lineHeight: 38px
    letterSpacing: -0.025em
  display-lg:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  kpi-stat:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-base:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-medium:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  body-bold:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  label-eyebrow:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.18em
  chip-status:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  card-pad: 20px
  section-gap: 26px
  gutter: 14px
---

## Brand & Style

This design system expresses the synthesis of high-performance automotive telemetry, mission-critical engineering discipline, and executive-level digital finish. It operates at the intersection of a professional endurance racing cockpit and a sovereign fintech command terminal. 

The emotional tone evokes unshakeable mechanical confidence, diagnostic precision, and calm situational control. Surfaces feel machined, deep, and glare-free. The system rejects frivolous decorative noise, toy-like hyper-rounded forms, and oversaturated neon gradients in favor of dark-first carbon plates, crisp hairline margins, liquid-glass refraction, and targeted photonic accents.

### Design Movement & Aesthetic Tenets
- **High-Density Automotive Telemetry:** Layouts prioritize clear information architecture, high signal-to-noise ratios, and uninterrupted glanceability under high cognitive loads.
- **Machined Layering & Specular Reflections:** Surface depth is forged through dark graphite obsidian tiers, low-reflectance frosted glass layers (`32px` blur with high saturation), and micro-specular 1px hairline top highlights.
- **Instrument-Grade Micro-Interactions:** Tactile physics simulate physical cockpit toggle switches with fast spring compressions (`160ms`), immediate state affirmation, and focused scarlet light halos.

## Colors

The color palette is architected for dark-mode telemetry clarity with full light-mode parity. The foundation is grounded in non-reflective obsidian and slate graphite, punctured by high-octane racing red accents for immediate behavioral direction.

### Palette Architecture
- **Primary Canvas (`#070A0E`):** Pure anti-glare midnight cockpit slate. Serves as the bottom-most canvas layer to anchor visual depth.
- **Elevated Surfaces (`#0B0F14` & `#11161D`):** Intermediate and card surfaces mimicking matte carbon instrumentation plates.
- **Raised Interactive Surfaces (`#1C232D`):** Modals, floating popovers, and elevated bento modules.
- **Primary Racing Scarlet (`#E31E24`):** High-priority call-to-action color, active telemetry indicators, and critical alert pathways.
- **Endurance Crimson (`#8B0D1A`):** Deep secondary structural red for borders, gradients, and focused focus-ring halos (`rgba(227, 30, 36, 0.35)`).
- **Prestige Automotive Gold (`#D4AF37`):** Tertiary status indicator dedicated exclusively to predictive intelligence, AI telemetry, and certified milestone states.
- **Sapphire Logistics Blue (`#3B82F6`):** Dedicated to vehicle logistics, supply chain telemetry, and part catalog status.
- **Telemetry Emerald (`#22C55E`):** Real-time operational health, powertrain verification, and confirmed states.
- **Warning Amber (`#F59E0B`):** Predictive diagnostic warnings, scheduled service reminders, and pending inspection reviews.

### Specular & Hairline System
Surfaces avoid blurry ambient shadow pools. Instead, separation is driven by 1px solid boundaries using `rgba(255, 255, 255, 0.09)` in default resting states, escalating to `rgba(227, 30, 36, 0.35)` upon focus or critical condition.

## Typography

The typographic hierarchy utilizes three complementary typefaces to create functional differentiation between aerodynamic brand presentation, data-dense mechanical readouts, and sustained technical body text:

- **Outfit (Display & Headings):** Expresses forward momentum, high velocity, and clean industrial proportions. Compact line heights (1.1x to 1.25x) prevent loose fragmentation on telemetry cards.
- **Space Grotesk (Telemetry, KPIs & Eyebrows):** Provides technical tabular precision for vehicle sensor metrics, financial figures, VIN strings, and diagnostic codes. Must always render with tabular numbers (`font-variant-numeric: tabular-nums`) to prevent layout shifts during live data polling.
- **DM Sans (Body & Operational Interfaces):** Delivers clean geometry and high legibility across dense service tickets, checklist rows, and technical parameter matrices.

## Layout & Spacing

The layout philosophy follows a strict 4px/8px incremental rhythm structured around a 12-column adaptive telemetry grid. 

### Grid & Telemetry Architecture
- **Desktop & Command Console (>= 1024px):** Max container width capped at `1600px` with fluid edge padding of `32px` to `40px`. Employs a 12-column structural grid for bento cards, with telemetry KPI strips rendering in a 4-column balanced configuration (`repeat(4, minmax(0, 1fr))`).
- **Tablet & Split-Cockpit (640px - 1023px):** Adapts to 2-column bento matrices and split-pane service bay inspectors (`280px` list panel + flexible detail stage).
- **Mobile Handheld (< 640px):** Single-column stacked layouts utilizing edge margins of `20px` and internal card paddings of `16px`. Content remains tight, dense, and vertically sequenced.

### Information Density
Gutters are held to a calibrated `14px`–`16px` range. This compression produces an authentic instrument panel character, grouping correlated operational metrics together while relying on crisp card borders rather than sprawling white space to isolate data domains.

## Elevation & Depth

Visual hierarchy does not rely on soft, multi-layered diffuse drop shadows that create visual haze. Depth is generated through **tonal layering**, **machined border specular lines**, and **liquid-glass refraction**:

### Depth Tiers
1. **Base Chassis (Level 0):** Background slate `#070A0E`. Completely non-reflective.
2. **Structural Panels (Level 1):** Solid `#11161D` plate with a 1px boundary of `rgba(255, 255, 255, 0.09)`.
3. **Interactive Bento Card (Level 2):** Elevated `#1C232D` surface topped with a 1px directional specular accent (`.card-accent-top`), giving the appearance of an internal instrument cockpit luminaire catching the upper bevel.
4. **Liquid Glass Floating Elements (Level 3):** Floating tab bars and navigation overlays utilize `backdrop-filter: blur(32px) saturate(1.7) brightness(1.04)`, layered over dual subtle gradients and a crisp 1px specular inner reflection rim (`rgba(255, 255, 255, 0.26)`).
5. **Photonic Telemetry Corona:** Active components do not cast heavy dark drop shadows; instead, they project a focused photonic red glow (`box-shadow: 0 4px 20px -4px rgba(227, 30, 36, 0.35)`).

## Shapes

The design system enforces a balanced, modern rounding philosophy calibrated to industrial hardware enclosures:

- **Micro Components (Buttons, Form Inputs, Toggles):** `8px` (`rounded-xs`) to `12px` (`rounded-sm`), delivering clean geometric alignment and mechanical tactile structure.
- **Panels & Bento Containers:** `16px` (`rounded-md`) to `20px` (`rounded-lg`), providing enough curvature to feel polished and organic without devolving into oversized, space-inefficient capsules.
- **Persistent Floating Controls & Badges:** `9999px` (`rounded-full`), reserved strictly for floating liquid-glass navigation pills, status indicator tags, and numeric micro-chips.

## Components

### Buttons
- **Primary:** High-Octane Scarlet background (`#E31E24`) with high-contrast text (`#FFFFFF`). Mechanical tactile feedback via spring micro-compression on active click (`scale(0.985)` with `160ms cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Secondary / Ghost:** Machined slate surface (`#161B22`) with fine hairline edge (`rgba(255, 255, 255, 0.09)`). Hover state lifts border luminance to `rgba(255, 255, 255, 0.20)`.
- **Heights:** 36px (compact telemetry), 40px (standard cockpit interaction), 44px (touch-first workflow actions).

### Inputs & Form Controls
- **Structure:** 40px height, 8px radius, matte dark fill (`#0B0F14`), and 1px border (`rgba(255, 255, 255, 0.09)`).
- **Interactive State:** Focused inputs execute a subtle 1px micro-lift (`translateY(-1px)`), accompanied by a dedicated Racing Scarlet hairline corona (`rgba(227, 30, 36, 0.35)`) and a subtle inner field glow.
- **Typography:** DM Sans 14px for general inputs, switching to Space Grotesk tabular figures for VIN, metric readouts, and license parameters.

### Bento Cards & Telemetry Tiles
- **Shell:** Obsidian plate (`#11161D`) bounded by a 16px corner radius and a 1px border. Hover elevations elevate the plate by `-2px` with a transition curve of `260ms cubic-bezier(0.22, 1, 0.36, 1)`.
- **Specular Header Highlight:** A linear gradient accent line across the top border edge illuminates under hover, simulating glancing cockpit LED overhead illumination.
- **KPI Tiles:** Composed of an uppercase 10px Space Grotesk tracking label, an isolated status glyph pill, and a large 30px tabular numeric display.

### Status Chips & Badges
- **Form:** Pill-shaped capsules (`rounded-full`, 11px bold type) featuring tinted alpha fills (`rgba(...)`, 14% opacity) and corresponding solid text.
- **Active Telemetry Dot:** Status chips embed an active 6px radial dot. Critical or in-progress states pulse rhythmically (`@keyframes pulse`) to convey real-time service activity.

### Liquid Glass Mobile Dock
- **Form:** Centered floating cockpit capsule docked at `bottom-[max(env(safe-area-inset-bottom),0.5rem)]`.
- **Finish:** Frosted liquid substrate with 32px backdrop blur, internal specular light sweep along the top margin, and tab items that illuminate in Racing Scarlet with an active spring transition.

### Diagnostic & AI Result Cards
- **Enclosure:** Distinctive 1px Prestige Gold (`#D4AF37`) hairline border with a faint ambient gold illumination drop. Contains confidence score indicators, algorithmic diagnostic telemetry, and repair latency trackers.