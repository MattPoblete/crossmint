'use client';

import Link from 'next/link';

import { WalletConnect } from '@/components/WalletConnect';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { useWallet } from '@/providers/WalletProvider';

export default function WalletPage() {
  const { isConnected, wallet, address, email } = useWallet();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-stellar-600 hover:text-stellar-700 mb-4 inline-block">
          &larr; Back to Home
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-stellar-700 dark:text-stellar-300 mb-2">
            Wallet Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage your Crossmint smart wallet
          </p>
        </header>

        {!isConnected ? (
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
            <WalletConnect />
          </section>
        ) : (
          <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Wallet Info</h2>
                <WalletConnect />
              </div>
              <div className="space-y-3">
                {email && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-sm">{email}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Address</label>
                  <p className="font-mono text-sm break-all">{address}</p>
                </div>
                {wallet?.chain && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Chain</label>
                    <p className="capitalize">{wallet.chain}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <BalanceDisplay />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/swap"
                  className="p-4 border border-stellar-200 dark:border-stellar-700 rounded-lg hover:bg-stellar-50 dark:hover:bg-stellar-900/20 transition-colors"
                >
                  <h3 className="font-medium text-stellar-700 dark:text-stellar-300">Swap Tokens</h3>
                  <p className="text-sm text-gray-500">Trade tokens on Soroswap DEX</p>
                </Link>
                <Link
                  href="/yield"
                  className="p-4 border border-stellar-200 dark:border-stellar-700 rounded-lg hover:bg-stellar-50 dark:hover:bg-stellar-900/20 transition-colors"
                >
                  <h3 className="font-medium text-stellar-700 dark:text-stellar-300">Earn Yield</h3>
                  <p className="text-sm text-gray-500">Deposit to Defindex vaults</p>
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
