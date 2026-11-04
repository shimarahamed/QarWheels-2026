# 09 — Accessibility and inclusive interaction

**Use for:** accessibility. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-081 · Build semantic structure

- **Apply:** Use real headings, landmarks, lists, buttons, links, and form controls before adding ARIA.
- **Verify:** Accessibility tree reflects visible structure.

### UX-082 · Support keyboard completely

- **Apply:** Make all functions reachable and operable without a pointer, with logical focus progression.
- **Verify:** End-to-end keyboard task is possible.

### UX-083 · Make focus visible

- **Apply:** Show a high-contrast visible focus indicator and never hide it without a robust replacement.
- **Verify:** Tab navigation is easy to track.

### UX-084 · Manage modal focus

- **Apply:** Focus the active dialog, contain focus appropriately, support Escape when safe, and restore focus on close.
- **Verify:** Screen-reader and keyboard users do not lose position.

### UX-085 · Meet text contrast

- **Apply:** Target WCAG 2.2 AA: at least 4.5:1 for ordinary text and 3:1 for qualifying large text.
- **Verify:** Automated and manual contrast checks pass.

### UX-086 · Provide usable target sizes

- **Apply:** Meet WCAG 2.2 AA target-size minimum or its documented exceptions; aim larger for touch comfort.
- **Verify:** Dense toolbars remain usable without precise pointing.

### UX-087 · Avoid dragging-only actions

- **Apply:** Provide a simple-pointer and keyboard-operated way to achieve any reorder or drag function unless truly essential.
- **Verify:** A user can complete the action without dragging.

### UX-088 · Announce dynamic outcomes

- **Apply:** Use scoped, appropriate live updates for confirmations, errors, and async status without announcement spam.
- **Verify:** Assistive users learn the important outcome.

### UX-089 · Provide media alternatives

- **Apply:** Add captions to meaningful audio, transcripts where appropriate, and relevant alt text for informative images.
- **Verify:** Content remains understandable without its primary sensory channel.

### UX-090 · Validate with assistive tech

- **Apply:** Check zoom, screen reader, keyboard, contrast, reduced motion, and forced colors as relevant.
- **Verify:** At least one manual assistive-tech path is reported, or explicitly untested.

