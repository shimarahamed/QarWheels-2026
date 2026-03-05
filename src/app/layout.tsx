import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, Outfit } from 'next/font/google';

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
  title: 'QarWheels - Intelligent Car Management',
  description: 'Predictive maintenance, digital service records, and trusted garages—all redesigned for Qatar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontBody.variable} ${fontHeadline.variable}`} suppressHydrationWarning>
      <body>
          {children}
      </body>
    </html>
  );
}
