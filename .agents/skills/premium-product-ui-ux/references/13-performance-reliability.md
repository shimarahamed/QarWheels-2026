# 13 — Performance, resilience and operational states

**Use for:** performance. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-121 · Optimize real interaction speed

- **Apply:** Measure responsiveness and long tasks on target devices before adding effects.
- **Verify:** Delayed interactions are addressed at source.

### UX-122 · Protect core content loading

- **Apply:** Prioritize visible primary content, compress assets, and avoid unnecessarily blocking render.
- **Verify:** Essential task appears promptly on slow connections.

### UX-123 · Reserve layout space

- **Apply:** Specify media dimensions and stable placeholders to reduce content jumps.
- **Verify:** Loading does not displace the user's target unexpectedly.

### UX-124 · Use honest loading states

- **Apply:** Distinguish skeleton, spinner, queued, saving, and completed states based on actual lifecycle.
- **Verify:** UI never claims server success prematurely.

### UX-125 · Design meaningful retry

- **Apply:** Offer retry with preserved context and explain when an operation may have already succeeded.
- **Verify:** Retrying cannot easily duplicate side effects.

### UX-126 · Support stale data labels

- **Apply:** Show freshness or sync state when cached content may differ from current truth.
- **Verify:** Users can distinguish cache from current data.

### UX-127 · Avoid expensive animations

- **Apply:** Prefer compositor-friendly transforms and opacity, and minimize forced layout during gestures.
- **Verify:** Low-end device interaction remains smooth.

### UX-128 · Handle no-JS or partial-failure

- **Apply:** Where appropriate, provide functional fallback, progressive enhancement, or a clear recovery path.
- **Verify:** Critical task is not silently blank after an error.

### UX-129 · Use lightweight assets

- **Apply:** Load responsive media, subset payloads, and defer offscreen extras without harming accessibility.
- **Verify:** Payload matches user context.

### UX-130 · Measure Core Web Vitals appropriately

- **Apply:** For web, watch field LCP, INP, and CLS with context rather than treating lab scores as business results.
- **Verify:** Regression checks include field or realistic lab evidence.

