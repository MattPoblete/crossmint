'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useWallet as useCrossmintWallet, useAuth } from '@crossmint/client-sdk-react-ui';
import type { StellarWallet, Chain, Wallet } from '@crossmint/client-sdk-react-ui';

interface WalletContextType {
  isConnected: boolean;
  isLoading: boolean;
  wallet: Wallet<Chain> | null;
  stellarWallet: StellarWallet | null;
  address: string | null;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { wallet, status } = useCrossmintWallet();
  const { login, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const stellarWallet = useMemo(() => {
    if (!wallet) return null;
    try {
      // Check if wallet is a Stellar wallet
      if (wallet.address?.startsWith('G') && wallet.address?.length === 56) {
        return wallet as unknown as StellarWallet;
      }
      return null;
    } catch {
      return null;
    }
  }, [wallet]);

  const value = useMemo(
    () => ({
      isConnected: status === 'loaded' && !!wallet,
      isLoading: status === 'in-progress',
      wallet: wallet ?? null,
      stellarWallet,
      address: wallet?.address ?? null,
      error,
      login,
      logout,
    }),
    [wallet, stellarWallet, status, error, login, logout]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
