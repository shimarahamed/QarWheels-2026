# Web implementation examples — adapt, do not paste blindly

Prefer the existing framework and animation library; use native `button`, `details`, `dialog` and browser support where appropriate. These are small examples of *behavior*, not a full component kit.

## Motion tokens and reduced motion

```css
:root {
  --ui-motion-fast: 120ms;
  --ui-motion-standard: 220ms;
  --ui-motion-expressive: 350ms;
  --ui-ease-out: cubic-bezier(.2,.8,.2,1);
}
@media (prefers-reduced-motion: reduce) {
  :root {
    --ui-motion-fast: 0ms;
    --ui-motion-standard: 0ms;
    --ui-motion-expressive: 0ms;
  }
}
```

## Button press

```html
<button class="motion-button" type="button">Save changes</button>
```

```css
.motion-button {
  transition: transform var(--ui-motion-fast) var(--ui-ease-out),
              background-color var(--ui-motion-fast) ease;
  transform: scale(1);
}
.motion-button:active { transform: scale(.95); }
.motion-button:focus-visible { outline: 3px solid var(--focus, #3056c9); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .motion-button:active { transform: none; filter: brightness(.92); }
}
```

CSS `:active` does not provide a real spring. If the product requires a spring, use the project's established motion library or native spring API and test release/cancellation. Avoid importing a dependency solely for this detail.

## Motion state-machine skeleton

```text
idle --pointerdown--> pressed --pointerup--> pending
pressed --cancel--> idle
pending --serverSuccess--> success
pending --serverError--> error
success/error --dismiss/reset--> idle
```

Do not trigger success on pointer-up; success belongs to the server-confirmed branch.

## Card transition

If using a native disclosure, preserve the `<summary>` keyboard behavior and semantics; otherwise use a labelled button with `aria-expanded` and `aria-controls`. Prefer transform/opacity for purely visual movement; use `height`/layout transition only when needed and measure realistic device cost. Manage focus when expanded content is modal.

## Sortable list

The animation cannot substitute for accessible reordering. Offer visible Move up/down controls where meaningful, announce new position, update data order atomically, and persist only upon successful save. Avoid deprecated drag accessibility patterns without testing with current assistive technology.

## Numeric changes

Render a stable machine-readable final value (e.g. accessible text or an aria-labelled number). Keep the rolling glyph layer `aria-hidden="true"`, do not flood live regions on every frame, and format locale/currency via the platform's internationalization APIs.

## Failure checks

- Transition must not delay the actual state update.
- Requests canceled/unmounted must not update stale components.
- User should be able to interrupt or reverse an expansion.
- Motion must not interfere with scroll or focus.
- Repeated actions must not queue endless animations.
