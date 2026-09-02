'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useRef, useState } from 'react';

const THRESHOLD = 72;   // px drag needed to trigger refresh
const MAX_PULL  = 110;  // px max visual drag travel
const DAMPEN    = 0.45; // resistance factor

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done';

export function PullToRefresh({ children }: { children: React.ReactNode }) {
    const router   = useRouter();
    const [phase, setPhase]   = useState<Phase>('idle');
    const [pullY, setPullY]   = useState(0);
    const touchStartY = useRef(0);
    const scrollRef   = useRef<HTMLDivElement>(null);

    const atTop = () => (scrollRef.current?.scrollTop ?? 0) <= 0;

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (!atTop()) return;
        touchStartY.current = e.touches[0].clientY;
        setPhase('pulling');
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (phase === 'refreshing' || phase === 'done') return;
        if (!atTop()) return;

        const delta = (e.touches[0].clientY - touchStartY.current) * DAMPEN;
        if (delta <= 0) { setPhase('idle'); setPullY(0); return; }

        const clamped = Math.min(delta, MAX_PULL);
        setPullY(clamped);
        setPhase(clamped >= THRESHOLD * DAMPEN * 1.1 ? 'ready' : 'pulling');
    }, [phase]);

    const onTouchEnd = useCallback(() => {
        if (phase === 'ready') {
            setPhase('refreshing');
            setPullY(THRESHOLD * 0.55);
            router.refresh();
            setTimeout(() => {
                setPhase('done');
                setTimeout(() => { setPhase('idle'); setPullY(0); }, 380);
            }, 1100);
        } else {
            setPhase('idle');
            setPullY(0);
        }
    }, [phase, router]);

    const isRefreshing = phase === 'refreshing';
    const progress = Math.min(pullY / (THRESHOLD * DAMPEN * 1.1), 1);
    const indicatorY = Math.max(pullY - 4, 0);
    const visible = phase !== 'idle' && phase !== 'done';

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Pull indicator */}
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: `translate(-50%, ${indicatorY - 52}px)`,
                    transition: phase === 'idle' || phase === 'done'
                        ? 'transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease'
                        : 'none',
                    opacity: visible ? 1 : 0,
                    zIndex: 50,
                    pointerEvents: 'none',
                }}
            >
                <div
                    className="liquid-glass flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
                    style={{
                        transform: `scale(${0.7 + progress * 0.3})`,
                        transition: isRefreshing ? 'transform 200ms ease' : 'none',
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                        style={{
                            stroke: 'hsl(var(--primary))',
                            transform: isRefreshing ? 'none' : `rotate(${progress * 270}deg)`,
                            animation: isRefreshing ? 'ptr-spin 700ms linear infinite' : 'none',
                            transition: !isRefreshing ? 'transform 80ms linear' : 'none',
                        }}
                    >
                        {isRefreshing ? (
                            /* Spinner arc */
                            <path d="M12 2a10 10 0 1 1-6.32 2.32" />
                        ) : (
                            /* Arrow pointing down */
                            <>
                                <path d="M12 5v14M5 12l7 7 7-7" />
                            </>
                        )}
                    </svg>
                </div>

                {/* "Release to refresh" / "Refreshing" label */}
                <div
                    style={{
                        position: 'absolute',
                        top: '110%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                        color: 'hsl(var(--muted-foreground))',
                        opacity: progress > 0.6 ? 1 : 0,
                        transition: 'opacity 150ms ease',
                    }}
                >
                    {isRefreshing ? 'Refreshing…' : phase === 'ready' ? 'Release to refresh' : 'Pull to refresh'}
                </div>
            </div>

            {/* Scrollable content — push down while pulling */}
            <div
                ref={scrollRef}
                className="h-full w-full overflow-y-auto"
                style={{
                    transform: `translateY(${pullY}px)`,
                    transition: phase === 'idle' || phase === 'done'
                        ? 'transform 400ms cubic-bezier(0.22,1,0.36,1)'
                        : 'none',
                    willChange: 'transform',
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}
