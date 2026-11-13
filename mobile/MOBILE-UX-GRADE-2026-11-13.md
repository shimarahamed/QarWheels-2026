# Mobile UI/UX Grade - 2026-11-13

Scope: the current Expo customer and vendor app. Scores are provisional code-review grades against the local premium product UI/UX skill, not screenshots, device testing, WCAG certification, or a store-release verdict. Preserve the existing Home content and section skeleton when improving it.

| Dimension | Score / 10 | Evidence and principal gap |
| --- | ---: | --- |
| Customer task flow | 6 | Booking request, live detail, quote and cancellation paths exist. Home still sends Roadside taps to a release-gated screen (`components/CustomerHome.tsx`, `lib/feature-availability.ts`). |
| Vendor task flow | 5 | Scoped live bookings, quote, assignment and invoice paths exist. Services and Staff remain device-local drafts and cannot complete cross-device catalog or roster tasks (`app/vendor/services.tsx`, `app/vendor/staff.tsx`). |
| Visual consistency | 6 | Shared theme and vendor type tokens exist (`lib/vendor-theme.ts`, `components/vendor/VendorText.tsx`); rendered alignment has not been inspected on devices. |
| Accessibility | 5 | Tab labels and selection states exist. Small-screen/large-text clipping and several icon-only controls still need screen-reader and dynamic-type checks (`components/GlassTabBar.tsx`, `app/(tabs)/quick.tsx`). |
| Reliability under load | 4 | Customer booking history is bounded, but vendor bookings and public branches still have unbounded listeners (`lib/firestoreOps.ts`, `lib/marketplace-source.ts`). No staging load evidence exists. |
| Test and acceptance evidence | 6 | Focused component/contract tests and Android/iOS/web bundle export pass. Installed native, Arabic RTL, tablet, large text, VoiceOver/TalkBack, offline and upgrade journeys remain unverified. |

## Next acceptance work

1. Make vendor Services and Staff persist to scoped backend records, or keep their actions clearly labeled as local drafts and out of the release-critical path.
2. Replace the Roadside dead end without removing the Home skeleton or implying an unprovided emergency service.
3. Translate the complete booking and vendor command flows before describing Arabic as an app-wide language choice.
4. Bound vendor/public listeners while preserving exact pending counts and dashboard totals, then measure read cost and latency in disposable staging.
5. Record compact/large phone and tablet screenshots and task runs at large text, light/dark, English/Arabic RTL, VoiceOver and TalkBack; fix observed clipping, focus and contrast defects.

Verdict: **Not ready for store submission**. The scores may change after device evidence and the unfinished workflows are addressed. See `MOBILE-ARCHITECTURE.md` for journey ownership and `MOBILE-RELEASE-GATES.md` for deployment criteria.
