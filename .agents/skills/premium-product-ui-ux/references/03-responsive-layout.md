# 03 — Responsive layout and spatial structure

**Use for:** layout. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-021 · Start with content hierarchy

- **Apply:** Prioritize reading and actions before choosing grids or breakpoints.
- **Verify:** Small screens retain the essential task.

### UX-022 · Use fluid containers

- **Apply:** Combine max-width boundaries with fluid widths rather than fixed desktop-only canvases.
- **Verify:** Content fits narrow and wide screens.

### UX-023 · Choose content breakpoints

- **Apply:** Adapt when components stop working, not solely at standard device widths.
- **Verify:** Intermediate widths have no awkward clipping.

### UX-024 · Protect readable line length

- **Apply:** Constrain long text measures and use suitable line height for scanning.
- **Verify:** Paragraphs stay comfortable on wide screens.

### UX-025 · Make spacing systematic

- **Apply:** Establish spacing tokens and use them consistently for related and unrelated content groups.
- **Verify:** Like relationships have like spacing.

### UX-026 · Respect safe areas

- **Apply:** Avoid covering essential controls with notches, system bars, browser chrome, or bottom gestures.
- **Verify:** Edge devices retain tappable controls.

### UX-027 · Handle long strings

- **Apply:** Plan for long names, numbers, translations, and unbroken identifiers without truncating critical meaning.
- **Verify:** Layout survives worst-case text fixtures.

### UX-028 · Use grid and flex intentionally

- **Apply:** Choose layout primitives matching content semantics; avoid absolute positioning for ordinary document flow.
- **Verify:** Resizing preserves order and reachability.

### UX-029 · Avoid horizontal overflow

- **Apply:** Prevent page-level sideways scrolling except for deliberate and accessible data views.
- **Verify:** A 320 CSS-pixel viewport remains navigable.

### UX-030 · Test zoom and reflow

- **Apply:** Check 200% zoom and narrow-screen reflow without losing task-critical content.
- **Verify:** Controls and information remain available under magnification.

