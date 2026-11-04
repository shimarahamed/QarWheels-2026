# 07 — Forms, validation and complex workflows

**Use for:** forms. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-061 · Ask only essential fields

- **Apply:** Remove or defer nonessential inputs and explain why sensitive details are required.
- **Verify:** Every required field maps to a genuine task need.

### UX-062 · Use correct input types

- **Apply:** Match email, phone, date, numeric, and autocomplete semantics to the expected value.
- **Verify:** Mobile keyboards and autofill are appropriate.

### UX-063 · Always label inputs

- **Apply:** Pair each control with a persistent accessible label and helpful instructions.
- **Verify:** Placeholder text is not the only label.

### UX-064 · Group related fields

- **Apply:** Use logical sections and fieldsets to clarify dependencies and reduce perceived effort.
- **Verify:** Users can scan each section's purpose.

### UX-065 · Validate at useful moments

- **Apply:** Validate after sufficient user intent rather than flashing errors during partial entry.
- **Verify:** Incomplete typing does not create noise.

### UX-066 · Preserve entered values

- **Apply:** Keep valid data and user edits after errors, reloads where appropriate, and recoverable submission failures.
- **Verify:** Retry never forces unnecessary re-entry.

### UX-067 · Link errors to fields

- **Apply:** Show specific inline messages and, for long forms, an actionable summary that targets invalid controls.
- **Verify:** Users reach every error by keyboard.

### UX-068 · Show process progress

- **Apply:** Expose steps, saved state, and exit/resume affordances for lengthy workflows.
- **Verify:** Users know remaining effort and can return safely.

### UX-069 · Guard destructive submission

- **Apply:** Use confirmation or undo based on reversibility and impact, without duplicating needless prompts.
- **Verify:** Accidental irreversible actions have protection.

### UX-070 · Handle double submission

- **Apply:** Disable or idempotently handle repeated requests and reconcile server feedback with button state.
- **Verify:** Duplicate taps do not create duplicate operations.

