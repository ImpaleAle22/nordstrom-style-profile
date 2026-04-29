import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/lib/theme';
import AppNav from '@/components/admin/AppNav';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Recipe Builder - Nordstrom Edit Engine",
  description: "Internal tool for creating and managing content recipes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
