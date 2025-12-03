import { StellarDefiClient } from '@stellar-defi/sdk';

// Environment variables
const CROSSMINT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? '';
const SOROSWAP_API_KEY = process.env.NEXT_PUBLIC_SOROSWAP_API_KEY ?? '';
const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet';

let clientInstance: StellarDefiClient | null = null;

/**
 * Get the base URL for Crossmint API
 * Uses proxy in browser to avoid CORS issues
 */
function getCrossmintBaseUrl(): string | undefined {
  if (typeof window !== 'undefined') {
    return '/api/crossmint';
  }
  return undefined;
}

/**
 * Get the singleton SDK client instance
 */
export function getClient(): StellarDefiClient {
  if (!clientInstance) {
    if (!CROSSMINT_API_KEY) {
      throw new Error('NEXT_PUBLIC_CROSSMINT_API_KEY is required');
    }
    if (!SOROSWAP_API_KEY) {
      throw new Error('NEXT_PUBLIC_SOROSWAP_API_KEY is required');
    }

    const baseUrl = getCrossmintBaseUrl();

    clientInstance = new StellarDefiClient({
      network: NETWORK,
      crossmint: {
        apiKey: CROSSMINT_API_KEY,
        baseUrl,
      },
      soroswapApiKey: SOROSWAP_API_KEY,
    });
  }

  return clientInstance;
}

/**
 * Reset the client instance (useful for testing or network changes)
 */
export function resetClient(): void {
  clientInstance = null;
}
