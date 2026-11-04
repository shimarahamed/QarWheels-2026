# Premium Product UI/UX — Codex skill

One **installable skill** with **160 distinct, actionable UI/UX patterns** across 16 topics, six additional implementation recipes based on the provided motion video, a structured audit rubric, implementation playbooks, accessibility/RTL checks, design-system tokens and source material from respected research and tutorial providers.

## Install in a project

From the directory where `premium-product-ui-ux.zip` is saved:

```bash
mkdir -p .agents/skills
unzip premium-product-ui-ux.zip -d .agents/skills/
```

## Install for the current user (all Codex projects)

```bash
mkdir -p ~/.agents/skills
unzip premium-product-ui-ux.zip -d ~/.agents/skills/
```

The ZIP contains the parent folder `premium-product-ui-ux/`. For Codex, project skill location is `.agents/skills/premium-product-ui-ux/SKILL.md`. Personal location is `~/.agents/skills/premium-product-ui-ux/SKILL.md`. Restart Codex if it doesn't notice the new skill immediately.

## Call from Codex

```text
$premium-product-ui-ux
Audit this app's onboarding and payments UX. Show the top 10 issues
ranked by severity, with specific components, screenshots if available,
UX-### references and testable fixes. Do not edit code.
```

```text
$premium-product-ui-ux
Improve my app's navigation, mobile layouts and form usability.
Inspect the existing repo first. Keep the current framework and design system.
Implement only high-impact fixes and run the available checks.
```

```text
$premium-product-ui-ux
Make the app feel premium with purposeful microinteractions.
Use only relevant patterns from the six motion recipes, honor reduced motion,
and make sure success states reflect real server outcomes.
```

```text
$premium-product-ui-ux
Design a reusable design system for a bilingual English/Arabic dashboard.
Include responsive layouts, RTL, components and their interaction states.
```

## What's included

- `SKILL.md`: activation metadata, task modes, workflow and acceptance rules.
- `references/00-catalog-index.md`: topical routing across rules UX-001 to UX-160.
- `references/01-*` through `16-*`: ten practical rules per chapter; every rule has an **Apply** and **Verify** instruction.
- `references/motion-recipes.md`: all six video-inspired interaction recipes and safeguards.
- `references/web-motion-implementation.md`: web motion token and interaction examples.
- `references/implementation-playbooks.md`: audit, build, redesign, design systems, conversion and motion workflows.
- `references/audit-scorecard.md`, `references/test-matrix.md`: evaluation and QA.
- `references/design-system-spec.md`, `assets/tokens.css`: optional token and component modeling guide.
- `references/sources.md`: official standards, research and verified tutorial URLs.
- `scripts/validate_skill.py`: checks catalog size, IDs, links and metadata locally.

## Validate after changes

```bash
python3 .agents/skills/premium-product-ui-ux/scripts/validate_skill.py
```

This checks **package structure only**. It does not certify real app usability, accessibility or video claims. The patterns are synthesized heuristics, not a set of 160 normative laws. The provided motion video is an inspiration for timing hypotheses; the measured values need platform- and product-specific testing.
