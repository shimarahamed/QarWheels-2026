# Dependency audit triage

Last reviewed: 2026-08-23 · Expo SDK 54.0.37

`npm audit` reports **23 advisories (9 high, 14 moderate)**. All 23 collapse to
**three transitive packages**, every one of which belongs to Expo's build
toolchain rather than the application bundle.

| Root package | Severity | Advisory | Reaches a user's device? |
|---|---|---|---|
| `image-size` ≤2.0.2 | high | [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) — DoS via infinite loop in JXL/HEIF parsers | **No** — `expo › @expo/metro › metro` |
| `postcss` ≤8.5.17 | high | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) — path traversal via `sourceMappingURL` | **No** — `expo › @expo/metro-config` |
| `uuid` <11.1.1 | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — missing buffer bounds check | **No** — `expo › @expo/config-plugins › xcode` |

## Decision: accept, do not force-fix

Reasoning:

1. **No runtime exposure.** Metro is the bundler, `@expo/metro-config` configures
   it, and `config-plugins`/`xcode` run during prebuild. None are linked into the
   iOS or Android binary, so no attacker-controlled input reaches them from a
   shipped app.
2. **The threat model does not apply.** All three advisories require feeding
   hostile input to the tool — a malicious image to `image-size`, a crafted
   `sourceMappingURL` to `postcss`. On a developer or CI machine building our own
   first-party source, that input is already trusted.
3. **`npm audit fix --force` would downgrade the SDK.** These versions are pinned
   by `expo@54`. Overriding them means either an unsupported dependency graph or
   a forced SDK change — materially more risk than the advisories carry.

## Re-review triggers

- Upgrading the Expo SDK — re-run and re-triage; upstream usually resolves these.
- Any **new** advisory naming a package that ships in the bundle
  (`react-native`, `firebase`, `expo-*` runtime modules, `zustand`).
- Any advisory rated **critical**.

Command used:

```sh
npm audit --json
```
