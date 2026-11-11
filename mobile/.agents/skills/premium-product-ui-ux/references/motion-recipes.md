# Six premium motion recipes — adapted from the supplied reference video

These settings are **experiment starting points, not design standards**. Keep gesture-driven motion tied to state and physics. Prefer native transitions for mobile and existing animation libraries for web. Test on low-power devices and honor accessibility settings.

## M01 — Button press: sink and spring

- **When:** Primary and secondary tap targets where tactile feedback adds clarity.
- **Trigger:** Pointer/touch down; scale around **0.95**; return to **1.0** via damped spring on release/cancel.
- **Guardrails:** Preserve hitbox; don't shift surrounding layout; pressed appearance must not imply completion; avoid repeated bounces and accidental double submission.
- **Reduced motion:** Instant pressed-color/border state and normal release, no transform.
- **Test:** Pointer cancellation, keyboard Space/Enter, disabled/loading state, very small button, nested element tap.

## M02 — Pull to refresh: resistance curve

- **When:** Touch scroll containers whose data can genuinely refresh and where the platform pattern fits.
- **Trigger:** Start only when at scroll top. Test displacement at about **0.35 × finger travel** initially; make curve progressively resist, cap travel, show threshold.
- **Guardrails:** Do not override native scrolling unnecessarily; don't fire while another gesture owns the pointer. Real network request determines completion.
- **Reduced motion:** Provide visible Refresh control with status text; suppress elastic exaggeration.
- **Test:** Short flick, threshold, cancel, offline, failed refresh, long list, iOS/Android scroll competition.

## M03 — Rolling numbers: contextual numeric continuity

- **When:** Meaningful changes to a value a user is tracking.
- **Trigger:** Stagger affected digit columns around **100 ms** while showing final semantic value accurately and promptly.
- **Guardrails:** Use locale-aware monetary formatting, currency symbols and negative values; avoid misleading transitions through invalid intermediary numbers. Suppress animations for rapidly streaming values.
- **Reduced motion:** Replace digits immediately; optionally use a subtle color change.
- **Test:** 999 → 1,000; negatives, decimals, currency changes, screen reader announcement, updates arriving mid-animation.

## M04 — Drag reorder: lift and make room

- **When:** User-controlled sortable lists where ordering matters.
- **Trigger:** Lift selected row to about **1.05** scale and animate sibling offsets over around **200 ms**.
- **Guardrails:** Preserve hitboxes and predictable drop location; display placeholder; support scroll while dragging; provide Up/Down or move-to-position buttons plus keyboard operation.
- **Reduced motion:** Strong outline/placeholder and immediate item moves.
- **Test:** Long list, rapid reorders, cancel, keyboard move, touch precision, announcement of final position.

## M05 — Card expansion: continuity to detail

- **When:** Card reveals more details without creating confusing navigation.
- **Trigger:** Animate from compact to expanded layout with **~350 ms ease-out**, using stable object identity or an established layout animation API.
- **Guardrails:** Keep heading/content legible; don't animate large layout dimensions every frame when avoidable. Set focus/scroll appropriately; make collapse predictable.
- **Reduced motion:** Immediate expand/collapse; retain same focus semantics.
- **Test:** Long content, expanding near viewport bottom, nested buttons, rapid open/close, Escape if dialog pattern is used.

## M06 — Success feedback: draw the win

- **When:** Confirmed saved, sent or completed state with high user value.
- **Trigger:** A circle appears, then the checkmark; roughly **470 ms** total.
- **Guardrails:** Only animate after authoritative success; show useful text such as 'Saved' or 'Payment complete'; distinguish queued from confirmed. Don't bury next action behind the animation.
- **Reduced motion:** Static icon/text or brief opacity change.
- **Test:** API delay, API failure, duplicate submits, navigation, live-region status and recovery.

## Shared engineering contract

For any selected recipe specify: `trigger`, `state owner`, `start/end`, `interrupt/cancel`, `error branch`, `reduced-motion equivalent`, `accessible announcement`, `performance budget`, `tests`. Do not add all six by default. Use the relevant UX-071–UX-080 patterns as acceptance criteria.
