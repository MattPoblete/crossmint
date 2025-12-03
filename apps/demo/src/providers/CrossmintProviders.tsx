'use client';

import { ReactNode } from 'react';
import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from '@crossmint/client-sdk-react-ui';

const CROSSMINT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? '';

interface CrossmintProvidersProps {
  children: ReactNode;
}

export function CrossmintProviders({ children }: CrossmintProvidersProps) {
  if (!CROSSMINT_API_KEY) {
    console.warn('NEXT_PUBLIC_CROSSMINT_API_KEY is not set');
    return <>{children}</>;
  }

  return (
    <CrossmintProvider apiKey={CROSSMINT_API_KEY}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: 'stellar',
            signer: { type: 'email' },
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
