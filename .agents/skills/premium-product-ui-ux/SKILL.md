---
name: premium-product-ui-ux
description: Design, implement, audit, or improve professional, accessible, responsive product UI/UX in a codebase. Use for app and website redesign, usability reviews, information architecture, visual hierarchy, forms, dashboards, design systems, mobile and RTL layouts, conversion flows, interaction polish, microanimations, UX QA, or requests to make a frontend feel premium. Supports 160 actionable UX patterns and six video-inspired motion recipes. Do not use for backend-only code or unrelated graphics work.
---

# Premium Product UI/UX — 160-pattern playbook

Deliver **usable, trustworthy, performant, accessible and visually coherent** interfaces. A polished screen is not success unless it helps the user finish the job.

## Select the operating mode

- **Audit** (`review`, `score`, `critique`, `find UX issues`): inspect; report prioritized, reproducible findings and proposed fixes. Do **not** edit code unless requested.
- **Implement** (`build`, `redesign`, `fix`, `make premium`): inspect the app; make scoped edits; validate changed flows. This is the default for action requests.
- **Specify** (`design system`, `wireframe spec`, `requirements`): provide information architecture, tokens, component/state specs, interaction rules, and acceptance criteria, without inventing finished implementation.
- **Optimize** (`improve conversions`, `simplify onboarding`, `reduce drop-off`): identify friction and hypotheses; change only approved scope; instrument/measure if available. Never invent performance uplifts.

## Workflow — always execute in order

1. **Inspect** user intent, platform/framework, current routes and components, `AGENTS.md`, design tokens, existing UI library, localization/RTL, constraints and tests. Respect existing architecture. If no repository is accessible, create a scoped design specification rather than pretending to have changed files.
2. **Define the job.** State user segment, primary task, surface being changed, current friction, expected outcome, and major non-goals. Ask only for a missing detail that would genuinely block progress; otherwise state reasonable assumptions.
3. **Load targeted references.** Start with `references/00-catalog-index.md`. Read only 1–3 relevant chapters from the 160-rule library (and motion, audit or execution guides if pertinent); do not dump all 160 rules into a coding prompt. Pattern IDs `UX-001`–`UX-160` are stable acceptance-check references.
4. **Prioritize correctness and accessibility.** Fix navigation, task completion, semantics, state truth, feedback and error recovery **before** decorative polish. Prefer familiar native patterns. Follow WCAG 2.2 AA-oriented checks for web without asserting conformance from scans alone.
5. **Plan a minimal change set.** Identify affected components, token additions, responsive behavior, all key states, accessibility needs, localization, and tests. Avoid unrelated rewrites and new dependencies when existing tools suffice.
6. **Implement with restraint.** Use consistent tokens and components. Preserve real data, authentication/permissions, state transitions and analytics semantics. Never use fabricated testimonials, success states, numbers, dark patterns or fake scarcity.
7. **Verify.** Run existing lint/typecheck/build/tests if available, check representative viewport sizes, keyboard operation, screen reader where available, reduced motion, long text/RTL if relevant, loading/error/empty states, and regressions. See `references/audit-scorecard.md` and `references/test-matrix.md`.
8. **Report clearly.** Provide changed paths, high-impact improvements, pattern IDs applied, checks actually executed, blockers and residual risks. Distinguish verified behavior from a proposed improvement.

## Reference routing

| Work type | Read |
|---|---|
| Find applicable rules | `references/00-catalog-index.md` |
| Inspect and prioritize issues | `references/audit-scorecard.md`, `references/test-matrix.md` |
| Implement or create components | `references/implementation-playbooks.md`, matching catalog chapters |
| Motion / polish | `references/08-motion-feedback.md`, `references/motion-recipes.md`, `references/web-motion-implementation.md` for web |
| Design tokens | `references/design-system-spec.md`, `assets/tokens.css` as an optional example |
| Evidence / tutorials | `references/sources.md` |

## Product-level non-negotiables

- **Scope:** Fulfill the user's requested job; do not rewrite the product or restyle unrelated pages merely because the skill was triggered.
- **Real functionality:** Maintain working routes, data and authentication. Do not replace real interactions with visual-only mockups unless explicitly prototyping.
- **Semantic interaction:** Use native semantic controls where possible; support keyboard, focus, readable errors and alternatives to drag-only interaction.
- **Responsive and international:** Avoid broken widths, clipped labels and hardcoded LTR assumptions; adapt to actual product language requirements.
- **Motion with purpose:** Animate state changes and spatial relationships only; honor reduced-motion settings. Six reference-video parameters are **starting hypotheses** rather than universal best practices.
- **Evidence levels:** Distinguish standards, empirical findings, design heuristics and hypotheses. Never claim a metric improved without measurement.
- **Maintainability:** Prefer existing libraries and conventions. Keep tokens small, patterns composable, and dependencies intentional.
- **Honest testing:** Automated scans cannot prove full usability or accessibility. Report tools and coverage precisely.

## Default deliverable structure

- **Recommendation / outcome** in 1–2 sentences.
- **Changes or issues** ranked P0 critical, P1 major, P2 moderate, P3 polish; include `UX-###` rule IDs when useful.
- **Verification** (exact commands, scenarios and outcomes) and known limitations.
- **Next steps**, if required, limited to the highest-impact 1–3 items.

## Completion bar

Do not declare a production UI complete unless the primary task works, relevant states are covered, keyboard and mobile access are evaluated, motion is optional, critical regressions are addressed, and performed validation is reported. Use the standards to guide judgment, not to force all 160 patterns onto a single screen.
