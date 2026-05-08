'use client';

import { Inter } from "next/font/google";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/lib/theme';
import AppNav from '@/components/admin/AppNav';
import { usePathname } from 'next/navigation';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-inter',
});

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminDashboard = pathname === '/admin';
  const isLifestyleImages = pathname === '/admin/lifestyle-images';
  const isSwipeStacks = pathname === '/admin/swipe-stacks';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={inter.variable}>
        {!isAdminDashboard && !isLifestyleImages && !isSwipeStacks && <AppNav />}
        {children}
      </div>
    </ThemeProvider>
  );
}
