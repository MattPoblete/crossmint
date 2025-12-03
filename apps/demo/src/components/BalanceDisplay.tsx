'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/providers/WalletProvider';

interface Balance {
  token: string;
  balance: string;
  decimals: number;
}

export function BalanceDisplay() {
  const { wallet, isConnected } = useWallet();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBalances() {
      if (!wallet || !isConnected) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await (wallet as any).balances(['xlm']);

        const balanceList: Balance[] = [];

        if (result.nativeToken) {
          balanceList.push({
            token: 'XLM',
            balance: result.nativeToken.balance || '0',
            decimals: result.nativeToken.decimals || 7,
          });
        }

        if (result.usdc) {
          balanceList.push({
            token: 'USDC',
            balance: result.usdc.balance || '0',
            decimals: result.usdc.decimals || 7,
          });
        }

        if (result.tokens) {
          for (const [symbol, data] of Object.entries(result.tokens)) {
            const tokenData = data as any;
            balanceList.push({
              token: symbol.toUpperCase(),
              balance: tokenData.balance || '0',
              decimals: tokenData.decimals || 7,
            });
          }
        }

        setBalances(balanceList);
      } catch (err) {
        console.error('Failed to fetch balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalances();
  }, [wallet, isConnected]);

  const formatBalance = (balance: string, decimals: number): string => {
    const value = parseFloat(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Balances</h3>
        {isLoading && (
          <span className="text-sm text-gray-500">Loading...</span>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {balances.length === 0 && !isLoading && !error && (
        <p className="text-gray-500 text-sm">No balances found</p>
      )}

      <div className="space-y-2">
        {balances.map((item) => (
          <div
            key={item.token}
            className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <span className="font-medium">{item.token}</span>
            <span className="font-mono">
              {formatBalance(item.balance, item.decimals)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
