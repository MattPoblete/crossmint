'use client';

import Link from 'next/link';

import { WalletConnect } from '@/components/WalletConnect';
import { useWallet } from '@/providers/WalletProvider';

export default function Home() {
  const { isConnected, address } = useWallet();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-stellar-700 dark:text-stellar-300 mb-4">
            Stellar DeFi SDK Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create smart wallets with Crossmint, swap tokens on Soroswap, and earn yield with
            Defindex
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Connect Wallet</h2>
          <WalletConnect />

          {isConnected && address && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-700 dark:text-green-300">
                Connected: {address.slice(0, 8)}...{address.slice(-8)}
              </p>
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <Link
            href="/wallet"
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold text-stellar-600 dark:text-stellar-400 mb-2">
              Wallet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage your Crossmint smart wallet
            </p>
          </Link>

          <Link
            href="/swap"
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold text-stellar-600 dark:text-stellar-400 mb-2">
              Swap
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Swap tokens on Soroswap DEX</p>
          </Link>

          <Link
            href="/yield"
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold text-stellar-600 dark:text-stellar-400 mb-2">
              Yield
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Deposit and earn yield with Defindex vaults
            </p>
          </Link>
        </section>

        <section className="mt-12 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">SDK Features</h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Crossmint Smart Account integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Ed25519 and Passkey (WebAuthn) signers
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Soroswap DEX for token swaps
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Defindex yield vaults
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Testnet and Mainnet support
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
