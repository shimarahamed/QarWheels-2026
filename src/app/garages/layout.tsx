'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';

// Public browse shell — no auth required. Anyone can look at garages and
// services here; the header stays lightweight (no sidebar, no account nav)
// since a visitor here may not have an account at all. A signed-in customer
// who lands here (e.g. via an old bookmark) gets a link back to their real
// dashboard instead of the sign-in prompt.
export default function GaragesPublicLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useFirebase();
  const isSignedIn = !isUserLoading && Boolean(user);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 80% 50% at 20% -10%, hsl(221 83% 53% / 0.09), transparent)',
            'radial-gradient(ellipse 60% 40% at 80% 110%, hsl(200 100% 55% / 0.06), transparent)',
            'linear-gradient(180deg, hsl(220 33% 98%), hsl(210 40% 96% / 0.6))',
          ].join(', '),
        }}
      />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <Button size="sm" className="h-9 rounded-xl px-4 font-semibold" asChild>
                <Link href="/dashboard">My dashboard</Link>
              </Button>
            ) : (
              <Button size="sm" className="h-9 rounded-xl px-4 font-semibold" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="page-motion relative z-10 mx-auto max-w-7xl p-3 sm:p-6 lg:p-8 xl:p-10">
        {children}
      </main>
    </div>
  );
}
