/**
 * Mapper functions to convert between Crossmint SDK types and our IWallet interface types
 */

import type { Wallet } from '@crossmint/wallets-sdk';
import type { StellarChain } from '@crossmint/wallets-sdk';
import type { WalletInfo, WalletBalance, SignerInfo, SignerType, SignerRole } from './types';
import type { Network } from '../config/networks';

/**
 * Maps a Crossmint SDK Wallet to our WalletInfo interface
 */
export function mapSdkWalletToWalletInfo(
  wallet: Wallet<StellarChain>,
  network: Network
): WalletInfo {
  return {
    address: wallet.address,
    publicKey: wallet.address, // Stellar address is derived from public key
    signers: extractSignersFromWallet(wallet),
    policies: [], // Policies are managed separately in smart account
    network,
  };
}

/**
 * Extract signers from SDK wallet configuration
 * Note: The SDK wallet may not expose all signer details directly
 */
function extractSignersFromWallet(wallet: Wallet<StellarChain>): SignerInfo[] {
  // The SDK wallet structure may vary - extract what's available
  const signers: SignerInfo[] = [];

  // If wallet has owner/signer info, extract it
  if (wallet.owner) {
    signers.push({
      type: inferSignerType(wallet.owner),
      publicKey: wallet.owner,
      role: 'admin' as SignerRole,
    });
  }

  return signers;
}

/**
 * Infer signer type from public key format
 */
function inferSignerType(publicKey: string): SignerType {
  // Stellar ed25519 public keys start with 'G'
  // secp256r1 keys may have different format
  if (publicKey.startsWith('G') && publicKey.length === 56) {
    return 'ed25519';
  }
  return 'secp256r1';
}

/**
 * Maps SDK balance response to our WalletBalance interface
 */
export function mapSdkBalancesToWalletBalances(
  balances: Array<{ asset?: string; balance?: string; decimals?: number }>
): WalletBalance[] {
  return balances.map((b) => ({
    asset: b.asset ?? 'XLM',
    balance: b.balance ?? '0',
    decimals: b.decimals ?? 7,
  }));
}

/**
 * Maps our signer type to SDK signer configuration
 */
export function mapSignerTypeToSdkConfig(signerType: SignerType): {
  type: 'email' | 'phone' | 'external-wallet';
} {
  // For now, we map our types to SDK signer types
  // ed25519 typically uses non-custodial (email/phone)
  // secp256r1 is used for passkeys/external wallets
  switch (signerType) {
    case 'ed25519':
      return { type: 'email' };
    case 'secp256r1':
      return { type: 'external-wallet' };
    default:
      return { type: 'email' };
  }
}
