'use client';

import { useState, useEffect } from 'react';
import type { Vault } from '@stellar-defi/sdk';

import { getClient } from '@/lib/sdk';

import { VaultCard } from './VaultCard';

export function VaultList() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVaults() {
      try {
        const client = getClient();
        const vaultList = await client.yield.getVaults();
        setVaults(vaultList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch vaults');
      } finally {
        setIsLoading(false);
      }
    }

    fetchVaults();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stellar-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center">
        <h3 className="text-lg font-medium mb-2">No Vaults Available</h3>
        <p className="text-gray-500">
          There are currently no vaults available on this network. Check back later or try a
          different network.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {vaults.map((vault) => (
        <VaultCard key={vault.address} vault={vault} />
      ))}
    </div>
  );
}
