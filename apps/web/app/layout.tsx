import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { NavLinks } from '@/components/nav-links';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WeGarden',
  description: 'Cross-platform gardening app — plan, grow, share.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <nav className="h-11 shrink-0 flex items-center px-4 gap-6 border-b bg-white dark:bg-zinc-950">
          <Link href="/" className="font-semibold text-sm tracking-tight">
            WeGarden
          </Link>
          <NavLinks />
        </nav>
        {children}
      </body>
    </html>
  );
}
