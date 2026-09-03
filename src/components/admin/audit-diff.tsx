'use client';

import { useMemo } from 'react';

function renderValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value || '""';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Deliberately shallow: a two-column key/value comparison over the union of
 * keys in `before`/`after`, with changed rows highlighted. Nested objects are
 * shown as compact JSON rather than recursively diffed.
 */
export function AuditDiff({
  before,
  after,
}: {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const keys = useMemo(
    () => Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort(),
    [before, after],
  );

  if (keys.length === 0) {
    return <p className="text-xs text-muted-foreground">No before/after snapshot recorded for this entry.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[minmax(6rem,1fr)_1.5fr_1.5fr] gap-px bg-border text-xs">
        <div className="bg-muted/60 px-3 py-2 font-semibold">Field</div>
        <div className="bg-muted/60 px-3 py-2 font-semibold">Before</div>
        <div className="bg-muted/60 px-3 py-2 font-semibold">After</div>
        {keys.map((key) => {
          const b = before?.[key];
          const a = after?.[key];
          const changed = renderValue(b) !== renderValue(a);
          return (
            <div key={key} className="contents">
              <div className="bg-card px-3 py-2 font-medium break-words">{key}</div>
              <div className={`px-3 py-2 break-words ${changed ? 'bg-destructive/5 text-destructive' : 'bg-card text-muted-foreground'}`}>
                {renderValue(b)}
              </div>
              <div className={`px-3 py-2 break-words ${changed ? 'bg-emerald-500/5 text-emerald-700' : 'bg-card text-muted-foreground'}`}>
                {renderValue(a)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
