import './globals.css';
import type { Metadata } from 'next';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { DM_Sans, Outfit } from 'next/font/google';

const body = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const headline = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'QarWheels',
  description: 'Intelligent Car Management, Redesigned for Qatar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${headline.variable}`} suppressHydrationWarning>
      <body>
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
