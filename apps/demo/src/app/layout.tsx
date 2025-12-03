import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { CrossmintProviders } from '@/providers/CrossmintProviders';
import { WalletProvider } from '@/providers/WalletProvider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stellar DeFi Demo',
  description: 'Demo application for Stellar DeFi SDK with Crossmint, Soroswap, and Defindex',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CrossmintProviders>
          <WalletProvider>{children}</WalletProvider>
        </CrossmintProviders>
      </body>
    </html>
  );
}
