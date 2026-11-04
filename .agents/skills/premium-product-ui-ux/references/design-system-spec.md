# Design system specification guide

Use **semantic roles**, not a one-off styling overhaul. Adapt to the repo's native token format (CSS custom properties, JS theme, design tokens, Swift, Compose, etc.). The `assets/tokens.css` file is an illustrative starting point, not an instruction to replace existing tokens.

## Minimum token families

- **Color:** text primary/secondary/inverse; surfaces base/raised/overlay; border default/strong; primary interactive; focus; success/warning/danger/info; disabled.
- **Type:** font family; body, small, label, title, display sizes; weight, line-height, tracking; support Arabic script when required.
- **Spacing:** compact to spacious steps and component-specific inset decisions.
- **Shape:** control, card, surface radii; do not mix arbitrary roundedness.
- **Elevation:** border/elevation levels appropriate to both light and dark themes.
- **Motion:** immediate/fast/standard/expressive, easing/spring values, reduced-motion alternatives.
- **Responsive:** content max widths, grid gaps and breakpoints derived from layout needs.

## Component state contract

For every interactive component, specify as applicable:

1. Semantics and accessible name.
2. Props and allowed variants.
3. Default, hover, focus, active, loading, disabled, error and success states.
4. Keyboard, pointer and touch behavior.
5. Label, hint, validation message and live announcement behavior.
6. Dense/small screen, zoom and long-label behavior.
7. RTL and mixed-script behavior.
8. Reduced-motion branch.
9. Async, canceled and unmount behavior.
10. Acceptance tests and usage examples.

## Document decisions

Create a short decision record for new tokens or components: problem solved; alternatives reused/considered; scope; consumers; migrations; known accessibility risks; tests. Avoid arbitrary RGB and timing values in page-local CSS when shared tokens exist.
