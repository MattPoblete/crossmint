'use client';

import Link from 'next/link';

import { VaultList } from '@/components/VaultList';
import { useWallet } from '@/providers/WalletProvider';

export default function YieldPage() {
  const { isConnected } = useWallet();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-stellar-600 hover:text-stellar-700 mb-4 inline-block">
          ← Back to Home
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-stellar-700 dark:text-stellar-300 mb-2">
            Yield Vaults
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Deposit and earn yield with Defindex vaults
          </p>
        </header>

        {!isConnected ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
            <p className="text-yellow-700 dark:text-yellow-300">
              Please connect your wallet first to interact with vaults.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block px-4 py-2 bg-stellar-600 text-white rounded-lg hover:bg-stellar-700 transition-colors"
            >
              Connect Wallet
            </Link>
          </div>
        ) : (
          <VaultList />
        )}
      </div>
    </main>
  );
}
