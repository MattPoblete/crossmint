'use client';

import { useState } from 'react';
import type { Vault } from '@stellar-defi/sdk';

import { useWallet } from '@/providers/WalletProvider';
import { getClient } from '@/lib/sdk';

interface VaultCardProps {
  vault: Vault;
}

export function VaultCard({ vault }: VaultCardProps) {
  const { address } = useWallet();
  const [isDepositing, setIsDepositing] = useState(false);
  const [amount, setAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTVL = (tvl: bigint): string => {
    const value = Number(tvl) / 10_000_000;
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const handleDeposit = async () => {
    if (!amount || !address) return;

    setIsDepositing(true);
    setError(null);

    try {
      const client = getClient();
      const depositAmount = BigInt(Math.floor(parseFloat(amount) * 10_000_000));

      const txXdr = await client.yield.buildDepositTransaction({
        vault: vault.address,
        amounts: [depositAmount],
        sourceAddress: address,
        invest: true,
      });

      console.log('Deposit transaction built:', txXdr);
      alert('Deposit transaction built! Check console for XDR.');
      setShowDeposit(false);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build deposit transaction');
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{vault.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{vault.symbol}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
          {vault.apy.toFixed(2)}% APY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">TVL</label>
          <p className="font-semibold">{formatTVL(vault.tvl)}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Assets</label>
          <p className="font-semibold">{vault.assets.map((a) => a.symbol).join(', ')}</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs text-gray-500 dark:text-gray-400">Strategies</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {vault.strategies.map((strategy, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-stellar-100 dark:bg-stellar-900/30 text-stellar-700 dark:text-stellar-300 rounded text-xs"
            >
              {strategy.name}
            </span>
          ))}
        </div>
      </div>

      {showDeposit ? (
        <div className="space-y-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount to deposit"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-stellar-500"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDeposit}
              disabled={isDepositing || !amount}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isDepositing ? 'Building...' : 'Confirm Deposit'}
            </button>
            <button
              onClick={() => {
                setShowDeposit(false);
                setAmount('');
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDeposit(true)}
          className="w-full px-4 py-2 bg-stellar-600 hover:bg-stellar-700 text-white rounded-lg font-medium transition-colors"
        >
          Deposit
        </button>
      )}
    </div>
  );
}
