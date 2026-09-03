import './globals.css';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, Outfit } from 'next/font/google';
import { headers } from 'next/headers';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const fontBody = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const fontHeadline = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'QarWheel — Your Car. Our Care.',
  description: "Qatar's car service marketplace — discover, compare, and book trusted garages.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set by middleware.ts on every request (broadened matcher covers every
  // page route) — reading it here lets this one inline script carry the
  // exact nonce the CSP header for THIS response allows, so script-src can
  // drop 'unsafe-inline' without blocking it. Falls back to undefined
  // (script runs unnoticed, same as before) for any render path middleware
  // genuinely didn't run on, rather than breaking the page.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" className={`${fontBody.variable} ${fontHeadline.variable}`} suppressHydrationWarning>
      <head>
        {/* Inline script prevents theme flash before React hydrates */}
        <script
          key="theme-init"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('qw-theme');if(t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider defaultTheme="system">
          <FirebaseClientProvider>
            <div className="app-motion-root">
              {children}
            </div>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
