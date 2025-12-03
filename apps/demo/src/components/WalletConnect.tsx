'use client';

import { useWallet } from '@/providers/WalletProvider';

export function WalletConnect() {
  const { isConnected, isLoading, address, error, login, logout } = useWallet();

  if (isConnected) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600 font-mono">
          {address ? `${address.slice(0, 8)}...${address.slice(-8)}` : 'Connected'}
        </p>
        <button
          onClick={logout}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Login with your email to create a Stellar smart wallet
      </p>

      <button
        onClick={login}
        disabled={isLoading}
        className="px-6 py-3 bg-stellar-600 hover:bg-stellar-700 disabled:bg-stellar-400 text-white rounded-lg font-medium transition-colors"
      >
        {isLoading ? 'Connecting...' : 'Login with Crossmint'}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
