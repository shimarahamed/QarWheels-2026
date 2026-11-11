# UI/UX audit scorecard

Use the scorecard for prioritization, **not** to claim a universal numerical UX score. No external score is implied.

## Severity

| Level | Meaning | Example | Action |
|---|---|---|---|
| P0 | Blocks core job, serious accessibility, safety or data integrity issue | Form cannot submit by keyboard; misleading payment confirmation | Fix before shipping |
| P1 | Material frustration or repeat failure in common path | Users lose entered form data on validation | Prioritize next |
| P2 | Moderate friction or inconsistent design with workaround | Confusing navigation label, cramped mobile toolbar | Schedule within scope |
| P3 | Cosmetic or low-frequency refinement | Slight easing inconsistency on secondary card | Only after higher priorities |

## Evaluate (0 absent/broken · 1 partial/inconsistent · 2 adequate · 3 excellent)

1. Core user task completion and understandable next action.
2. Navigation discoverability, consistency and recovery.
3. Information hierarchy, copy and content comprehension.
4. Forms, validation and error recovery.
5. Accessibility: semantic controls, focus, keyboard, contrast, media alternatives.
6. Mobile, viewport, zoom and if relevant RTL.
7. Honest loading, empty, error and success states.
8. Performance and interaction feedback.
9. Trust, privacy, transparent pricing and consequences.
10. Design-system consistency and maintainability.

Record N/A rather than awarding points to unrelated categories. Aggregate only if the same categories and weights are retained across comparisons; report raw findings first. Do not treat the rubric as a validated user research instrument.

## Finding template

```text
ID: F-01
Severity: P1
Location: src/features/checkout/DeliveryForm.tsx (or screen/route)
Observation: Postal-code error appears only in a toast.
Impact: Users cannot locate the field causing failure.
Evidence: Reproduced by submitting a malformed value.
Standards: UX-066, UX-067, UX-088 (as applicable)
Fix: Add field-associated error, preserve other inputs, and link from summary.
Verification: Keyboard-only resubmission + screen-reader announced error.
```

## Confidence indicators

- **Observed:** reproduced in code, browser, or user session.
- **Inferred:** plausible risk based on structure or source guidance; requires validation.
- **Hypothesis:** proposed improvement with expected benefit but no proven impact.

Avoid attributing ROI or conversion improvements to a visual change without controlled evidence.
