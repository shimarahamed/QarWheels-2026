# 02 — Information architecture and navigation

**Use for:** navigation. Each rule is a context-sensitive heuristic unless a formal standard is explicitly named; do not apply mechanically.

### UX-011 · Organize by user tasks

- **Apply:** Group destinations around user goals, not database entities or team structure.
- **Verify:** A person can predict where a task belongs.

### UX-012 · Use familiar labels

- **Apply:** Prefer language the audience recognizes over internal acronyms and clever category names.
- **Verify:** Navigation labels are understood without tooltips.

### UX-013 · Show current location

- **Apply:** Expose active item, page title, and hierarchy where applicable.
- **Verify:** Users can answer where they are and how to return.

### UX-014 · Limit top-level choices

- **Apply:** Keep primary destinations to a manageable set; group related secondary areas instead of a flat mega-menu.
- **Verify:** Main navigation has no indistinguishable duplicates.

### UX-015 · Preserve back behavior

- **Apply:** Ensure back navigation restores meaningful context, selection, and scroll when appropriate.
- **Verify:** Going back does not unexpectedly discard progress.

### UX-016 · Provide robust search

- **Apply:** Offer search when content density warrants it, with tolerance for common terms and useful results.
- **Verify:** Queries produce understandable matching and zero-result states.

### UX-017 · Offer clear filters

- **Apply:** Distinguish filtering from sorting, show active constraints, and make reset easy.
- **Verify:** Users can see and remove applied filters.

### UX-018 · Use breadcrumbs selectively

- **Apply:** Provide hierarchical breadcrumbs for deep information spaces, not as a substitute for clear navigation.
- **Verify:** Each crumb maps to a meaningful ancestor.

### UX-019 · Design empty destinations

- **Apply:** Explain why a page has no content and offer the next valid action.
- **Verify:** The empty state never strands users.

### UX-020 · Prevent dead-end pages

- **Apply:** Provide recovery routes from missing records, access denial, and invalid URLs.
- **Verify:** Users can navigate onward without browser refresh.

