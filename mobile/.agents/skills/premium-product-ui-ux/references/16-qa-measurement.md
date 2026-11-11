# 16 — UX QA, experimentation and handoff

**Use for:** qa. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-151 · Create scenario coverage

- **Apply:** Test the happy path plus empty, error, pending, disabled, interrupted, and permission-denied states.
- **Verify:** Each crucial flow has a documented scenario matrix.

### UX-152 · Test representative viewports

- **Apply:** Review narrow phone, large phone, tablet, and desktop dimensions relevant to the product.
- **Verify:** Breakpoint transitions show no visual regressions.

### UX-153 · Use realistic fixture data

- **Apply:** Include long names, high totals, zero records, large lists, and slow responses.
- **Verify:** Layout and behavior survive edge-case content.

### UX-154 · Check keyboard workflows

- **Apply:** Complete the primary journey with Tab, Shift+Tab, Enter, Space, and Escape where appropriate.
- **Verify:** No keyboard trap or invisible focus remains.

### UX-155 · Run automated accessibility scans

- **Apply:** Use existing lint and accessibility test tools as a first pass, then do manual checks.
- **Verify:** No unsupported claim of full accessibility compliance is made.

### UX-156 · Test real performance

- **Apply:** Use a throttled network and constrained CPU/device for critical flows.
- **Verify:** Interaction feedback remains responsive under stress.

### UX-157 · Compare before and after

- **Apply:** Capture stable screenshots or behavioral recordings of changed areas when tools permit.
- **Verify:** Review shows meaningful difference without unintended drift.

### UX-158 · Document design decisions

- **Apply:** Record chosen patterns, alternatives, tradeoffs, and exceptions concisely.
- **Verify:** Future engineers can understand why decisions were made.

### UX-159 · Measure experiments responsibly

- **Apply:** Define hypothesis, population, primary metric, guardrails, and stopping rules before A/B testing.
- **Verify:** Results are not interpreted from vanity metrics.

### UX-160 · Report honest completion

- **Apply:** Distinguish shipped changes, recommendations, executed tests, blocked tests, and remaining risks.
- **Verify:** Stakeholders know exactly what was verified.

