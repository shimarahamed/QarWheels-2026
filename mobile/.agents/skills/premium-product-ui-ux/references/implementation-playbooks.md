# Implementation playbooks

## A. Audit an existing application

1. Read the target routes and running configuration. Get screenshots at useful viewport sizes if the current tools support them.
2. Execute the main task; capture the first confusing or failing step and its consequences.
3. Examine state coverage (default/empty/loading/error/success), navigation and form recovery.
4. Perform keyboard, zoom, reduced-motion, and relevant mobile/RTL checks; use `test-matrix.md`.
5. Score findings with `audit-scorecard.md`, connect each to a rule ID and a concrete file/component.
6. Recommend the smallest high-impact fixes; do not mutate code if the user requested audit only.

## B. Build a new screen

1. Write one sentence for the user job, primary action and success condition.
2. Outline content order and information hierarchy before writing markup.
3. Reuse existing layout, typography, tokens and controls; introduce only missing shared primitives.
4. Define responsive placement and mobile priority, including long text and empty/failed states.
5. Implement semantic structure and keyboard behavior, then visual styling and meaningful motion.
6. Verify with scenario fixtures; report exactly what was tested.

## C. Redesign an existing screen

1. Record routes, interactions, validations, test IDs and analytics events that must not change.
2. Identify P0/P1 problems with evidence; write visual-only ambitions separately.
3. Refactor progressively, preserving state ownership and server contracts.
4. Compare old/new screens and interaction results. Check no information or permission was lost.
5. Supply concise before/after and remaining regressions.

## D. Build a design system

1. Inventory existing colors, text styles, spacing, components and duplicate patterns.
2. Define semantic tokens, themes and component contracts in `design-system-spec.md`.
3. Prioritize Button, Input, Field, Select, Dialog, Toast, Table and Navigation as demand warrants.
4. Specify props, variants, focus, validation, loading, disabled, touch, keyboard and reduced motion.
5. Update representative screens, then run visual and interaction regression checks.
6. Write adoption notes and a migration plan; do not migrate every screen without approval.

## E. Improve a conversion or onboarding flow

1. Map the funnel from entry to completed outcome with denominator for each step.
2. Locate friction in required fields, permissions, price clarity, error recovery and cognitive load.
3. Generate a small number of hypotheses tied to observed user problems.
4. Change one bottleneck at a time where measurement supports isolation; preserve honest choice.
5. Measure task completion and user comprehension alongside conversion and guardrails.

## F. Apply premium motion

1. Identify the actual state transition, not a desired visual effect alone.
2. Choose a maximum of 1–3 high-value patterns from `motion-recipes.md` unless requested otherwise.
3. Use project motion tokens and existing animation APIs.
4. Implement real success/error truth, interruption behavior and reduced-motion branch.
5. Validate with mouse, keyboard, touch and slow devices as relevant.

## Output contracts

**Audit:** `[Priority] [route/component] → observed issue → user impact → evidence → rule IDs → proposed remediation → how to verify`.

**Implementation:** `Changed files; task behavior; responsive/RTL behavior; state coverage; accessibility; commands run; residual issues`.

**Spec:** `User job; information hierarchy; component inventory; tokens; states; interaction constraints; acceptance criteria; assumptions`.
