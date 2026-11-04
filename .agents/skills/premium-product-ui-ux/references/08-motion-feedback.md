# 08 — Motion and interaction feedback

**Use for:** motion. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-071 · Give immediate acknowledgement

- **Apply:** Show pressed, busy, or changed state promptly for relevant interactions.
- **Verify:** Users never wonder whether a tap registered.

### UX-072 · Use button compression selectively

- **Apply:** Start with scale 0.95 on touch-down and damped spring to 1 on release; adjust to existing design language.
- **Verify:** Press feels tactile without layout movement.

### UX-073 · Add physical refresh resistance

- **Apply:** For pull-to-refresh, test initial list displacement near 35% of finger travel and cap overscroll; signal threshold.
- **Verify:** List does not travel one-to-one or trigger accidentally.

### UX-074 · Roll changed digits responsibly

- **Apply:** Stagger meaningful digit changes around 100 ms while keeping a readable formatted final number available.
- **Verify:** Changes do not misrepresent financial values.

### UX-075 · Make reorder pickup explicit

- **Apply:** Start with a 1.05 lifted scale and approximately 200 ms sibling shifts; provide non-drag alternatives.
- **Verify:** Destination and order remain clear.

### UX-076 · Animate card expansion spatially

- **Apply:** Try 350 ms ease-out while managing focus, scroll, interruption, and reduced-motion equivalents.
- **Verify:** Expanded content is immediately operable.

### UX-077 · Sequence success confirmation

- **Apply:** Use circle then checkmark within approximately 470 ms only after confirmed success.
- **Verify:** Visual and accessible status agree.

### UX-078 · Use shared motion tokens

- **Apply:** Standardize quick, normal, and expressive durations and corresponding easings.
- **Verify:** Components do not mix arbitrary physics.

### UX-079 · Honor reduced motion

- **Apply:** Replace nonessential movement with opacity or instant state transitions while retaining informative feedback.
- **Verify:** Prefers-reduced-motion users finish the same task.

### UX-080 · Prevent animation races

- **Apply:** Cancel or reconcile transitions on rapid re-click, navigation, errors, unmounts, and incoming state updates.
- **Verify:** State remains truthful under interruption.

