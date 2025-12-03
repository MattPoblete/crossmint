/**
 * Integration tests for Crossmint Wallet SDK
 *
 * These tests run against the REAL Crossmint staging API.
 * They require CROSSMINT_STAGING_API_KEY environment variable.
 *
 * Run with: pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// TODO: Import from @crossmint/wallets-sdk when refactoring
// import { CrossmintWallets, createCrossmint, StellarWallet } from '@crossmint/wallets-sdk';

import { CrossmintWallet } from '../crossmint';
import type { WalletInfo } from '../types';

/**
 * Skip tests if no staging API key is available
 */
function skipWithoutApiKey(): boolean {
  return !process.env.CROSSMINT_STAGING_API_KEY;
}

describe('CrossmintWallet SDK Integration', () => {
  let wallet: CrossmintWallet;
  let createdWalletAddress: string | null = null;

  beforeAll(() => {
    if (skipWithoutApiKey()) {
      console.warn('Skipping integration tests: CROSSMINT_STAGING_API_KEY not set');
      return;
    }

    wallet = new CrossmintWallet({
      apiKey: process.env.CROSSMINT_STAGING_API_KEY!,
      network: 'testnet',
    });
  });

  afterAll(() => {
    // Cleanup if needed
    createdWalletAddress = null;
  });

  describe('Wallet Creation', () => {
    it.skipIf(skipWithoutApiKey())('creates a wallet with ed25519 signer', async () => {
      const walletInfo = await wallet.createWallet({
        signerType: 'ed25519',
      });

      expect(walletInfo).toBeDefined();
      expect(walletInfo.address).toBeDefined();
      // Stellar addresses start with G
      expect(walletInfo.address).toMatch(/^G[A-Z0-9]{55}$/);
      expect(walletInfo.network).toBe('testnet');

      createdWalletAddress = walletInfo.address;
    });

    it.skipIf(skipWithoutApiKey())('creates a wallet with secp256r1 signer (passkey)', async () => {
      const walletInfo = await wallet.createWallet({
        signerType: 'secp256r1',
      });

      expect(walletInfo).toBeDefined();
      expect(walletInfo.address).toMatch(/^G[A-Z0-9]{55}$/);
    });

    it.skipIf(skipWithoutApiKey())('wallet has signers array', async () => {
      const walletInfo = await wallet.createWallet({
        signerType: 'ed25519',
      });

      expect(walletInfo.signers).toBeDefined();
      expect(Array.isArray(walletInfo.signers)).toBe(true);
    });
  });

  describe('Wallet Retrieval', () => {
    it.skipIf(skipWithoutApiKey())('retrieves existing wallet by address', async () => {
      // First create a wallet
      const created = await wallet.createWallet({
        signerType: 'ed25519',
      });

      // Then retrieve it
      const retrieved = await wallet.getWallet(created.address);

      expect(retrieved.address).toBe(created.address);
    });

    it.skipIf(skipWithoutApiKey())('throws error for non-existent wallet', async () => {
      const fakeAddress = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTU';

      await expect(wallet.getWallet(fakeAddress)).rejects.toThrow();
    });
  });

  describe('Balance Retrieval', () => {
    it.skipIf(skipWithoutApiKey())('returns balances array for wallet', async () => {
      const created = await wallet.createWallet({
        signerType: 'ed25519',
      });

      const balances = await wallet.getBalances(created.address);

      expect(Array.isArray(balances)).toBe(true);
      // New wallet may have empty balances or XLM
    });
  });
});

/**
 * Tests for the SDK-based implementation (to be implemented)
 * These will replace the REST API implementation
 */
describe('CrossmintWallet with @crossmint/wallets-sdk', () => {
  describe.todo('SDK Wallet Creation', () => {
    it.todo('creates stellar wallet using CrossmintWallets.getOrCreateWallet');
    it.todo('supports email signer type');
    it.todo('supports external-wallet signer type');
  });

  describe.todo('SDK Transaction Operations', () => {
    it.todo('sends transaction with contract invocation');
    it.todo('sends pre-serialized transaction XDR');
    it.todo('supports experimental_prepareOnly mode');
  });

  describe.todo('SDK Signer Operations', () => {
    it.todo('creates StellarExternalWalletSigner');
    it.todo('signs transaction via external signer callback');
  });
});
