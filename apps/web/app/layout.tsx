import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { NavLinks } from '@/components/nav-links';
import { MobileNav } from '@/components/mobile-nav';
import { NavAuth } from '@/components/nav-auth';
import { NotificationsBell } from '@/components/notifications-bell';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/sonner';
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
      suppressHydrationWarning
    >
      <body className="h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <nav className="h-11 shrink-0 flex items-center px-4 gap-4 border-b bg-background">
            <MobileNav />
            <Link href="/" className="font-semibold text-sm tracking-tight">
              WeGarden
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <NavLinks />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <NotificationsBell />
              <ThemeToggle />
              <NavAuth />
            </div>
          </nav>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
