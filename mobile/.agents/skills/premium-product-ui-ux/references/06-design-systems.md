# 06 — Design systems and component architecture

**Use for:** systems. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-051 · Create semantic tokens

- **Apply:** Define roles for text, surfaces, borders, focus, and feedback instead of scattering raw color values.
- **Verify:** Theme updates require few central edits.

### UX-052 · Tokenize spacing and type

- **Apply:** Centralize spacing, typography, radius, and elevation choices.
- **Verify:** Components share predictable values.

### UX-053 · Reuse native controls

- **Apply:** Prefer the existing design library and platform primitives before making custom components.
- **Verify:** New UI matches established interaction patterns.

### UX-054 · Define variant intent

- **Apply:** Give components clear size, importance, and destructive variants rather than arbitrary style combinations.
- **Verify:** Each variant has a valid use case.

### UX-055 · Specify complete states

- **Apply:** Design default, hover, focus, active, loading, disabled, success, error, and empty states where relevant.
- **Verify:** State matrix covers key components.

### UX-056 · Separate behavior from styling

- **Apply:** Preserve keyboard semantics, validation, and state machines while allowing visual variants.
- **Verify:** Styling changes do not regress interaction behavior.

### UX-057 · Name components by role

- **Apply:** Use names such as PrimaryButton or StatusBadge rather than colors or page coordinates.
- **Verify:** Components remain meaningful after redesign.

### UX-058 · Document composition rules

- **Apply:** Define which components can nest, which can stretch, and where complex patterns belong.
- **Verify:** Engineers avoid ad hoc compositions.

### UX-059 · Support design token evolution

- **Apply:** Introduce aliases or migrations for renamed tokens rather than breaking unrelated screens.
- **Verify:** Existing consumers stay functional.

### UX-060 · Track reusable patterns

- **Apply:** Promote repeated page patterns into shared components only after stable use cases emerge.
- **Verify:** Abstraction reduces duplication without erasing differences.

