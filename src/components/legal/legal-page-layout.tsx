import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Shared chrome for standalone legal documents (Privacy Policy, Terms of
// Service). Deliberately a plain server component — no client JS needed for
// static content, and it must render (and be crawlable/linkable) without an
// authenticated session, unlike everything under /dashboard or /vendor.
export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Draft — pending legal review</AlertTitle>
          <AlertDescription>
            This document is a template pending review by qualified legal counsel before public launch.
            It should not be relied upon as final until that review is complete.
          </AlertDescription>
        </Alert>

        <div className="legal-prose mt-8">
          {children}
        </div>
      </main>

      <footer className="border-t border-border px-4 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms of Service</Link>
          <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
        </div>
        <p className="mx-auto mt-3 w-full max-w-3xl text-[11px] text-muted-foreground/50">
          © 2026 QarWheel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
