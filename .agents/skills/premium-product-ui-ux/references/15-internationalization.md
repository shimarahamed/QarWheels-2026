# 15 — Localization, RTL and global product UX

**Use for:** i18n. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-141 · Externalize UI strings

- **Apply:** Keep user-facing copy out of code and use translation keys with context.
- **Verify:** Text can be translated without code changes.

### UX-142 · Use logical CSS properties

- **Apply:** Prefer inline-start, inline-end, and writing-direction-aware layout over hard-coded left/right for directional UI.
- **Verify:** RTL layouts do not require duplicate stylesheets.

### UX-143 · Mirror directional affordances

- **Apply:** Adapt navigation arrows, step sequence, and directional motion where semantics require it; do not mirror brand marks.
- **Verify:** Back and forward remain intuitive in RTL.

### UX-144 · Support mixed-script text

- **Apply:** Handle Arabic-English mixed labels, phone numbers, codes, and identifiers with controlled bidi isolation.
- **Verify:** Number and product-name ordering stays correct.

### UX-145 · Avoid fixed text dimensions

- **Apply:** Expect expansion and different glyph metrics across languages.
- **Verify:** Long translations do not clip controls.

### UX-146 · Localize data formats

- **Apply:** Apply locale rules for numbers, money, dates, calendar systems if relevant, and pluralization.
- **Verify:** Screen examples display correct regional conventions.

### UX-147 · Choose language deliberately

- **Apply:** Detect preference cautiously, allow explicit switching, and preserve language choice.
- **Verify:** Users can override automatic language detection.

### UX-148 · Respect regional address forms

- **Apply:** Adapt state/province, postal code, and phone structure instead of hard-coded US assumptions.
- **Verify:** Users can submit valid local information.

### UX-149 · Test fonts and diacritics

- **Apply:** Verify script coverage, line height, truncation, and glyph rendering in multilingual themes.
- **Verify:** Arabic diacritics and long names are legible.

### UX-150 · Keep translations contextual

- **Apply:** Review verbs, error messages, and cultural metaphors for local meaning, not word-for-word equivalence.
- **Verify:** Native-language reviewers understand the intended action.

