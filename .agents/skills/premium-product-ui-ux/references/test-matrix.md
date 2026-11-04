# UI verification matrix

Test relevant dimensions for the task rather than every permutation.

| Area | Scenarios | Evidence |
|---|---|---|
| Main journey | Start, complete, go back, resume, repeat | Route outcome, data/state |
| States | Empty, loading, error, success, disabled, permission denial | Screens and messages |
| Layout | 320, 375, 768, 1024, 1440 CSS px where applicable | No clipping/overlap, important actions visible |
| Content | Very long translated text, 0/1/many rows, large numbers | Readable and reachable controls |
| Input | Mouse, touch, keyboard, software keyboard | Full task without pointer where applicable |
| A11y | Heading hierarchy, labels, contrast, focus, announcements, zoom | Tools used + manual coverage |
| Motion | Normal/reduced motion, rapid input, interrupted transitions | Same task and state truth in both modes |
| RTL/i18n | `dir=rtl`, mixed English/Arabic, local date/currency | Intentional order, no bidi corruption |
| Reliability | Slow network, request failure, retry, offline if applicable | Honest state, no data loss/duplicate submission |
| Performance | Target hardware, scroll/gesture, LCP/INP/CLS for web | Measurements and caveats |

## Release checklist

- [ ] Main user task is understandable and completes.
- [ ] Navigation and back behavior work.
- [ ] Forms preserve valid inputs and show field-level repair instructions.
- [ ] Loading/empty/error/success states are correct.
- [ ] Focus and keyboard operation are verified.
- [ ] Critical color contrast and pointer target checks are done.
- [ ] Small-screen width and large-text zoom remain usable.
- [ ] Reduced motion offers equivalent feedback.
- [ ] No fabricated urgency, success, data or privacy claims.
- [ ] Existing project lint, typecheck, tests and build executed or limitations stated.

An automated accessibility test is a useful detector, **not** proof of WCAG conformance. Always state whether browser/device/manual tests were available.
