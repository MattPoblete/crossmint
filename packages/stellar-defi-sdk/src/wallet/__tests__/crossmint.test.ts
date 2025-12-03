import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CrossmintWallet } from '../crossmint';
import type { CrossmintWalletConfig, CreateWalletOptions } from '../types';
import { ConfigurationError, WalletError } from '../../errors';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CrossmintWallet', () => {
  let wallet: CrossmintWallet;
  const config: CrossmintWalletConfig = {
    apiKey: 'test-api-key',
    network: 'testnet',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    wallet = new CrossmintWallet(config);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(wallet).toBeInstanceOf(CrossmintWallet);
      expect(wallet.getNetwork()).toBe('testnet');
    });

    it('should throw ConfigurationError for empty apiKey', () => {
      expect(() => new CrossmintWallet({ ...config, apiKey: '' })).toThrow(ConfigurationError);
      expect(() => new CrossmintWallet({ ...config, apiKey: '' })).toThrow('API key is required');
    });

    it('should use correct base URL for testnet', () => {
      const testnetWallet = new CrossmintWallet({ ...config, network: 'testnet' });
      expect(testnetWallet.getNetwork()).toBe('testnet');
    });

    it('should use correct base URL for mainnet', () => {
      const mainnetWallet = new CrossmintWallet({ ...config, network: 'mainnet' });
      expect(mainnetWallet.getNetwork()).toBe('mainnet');
    });

    it('should use default RPC URL when not provided', () => {
      const testWallet = new CrossmintWallet(config);
      expect(testWallet.getRpcUrl()).toBe('https://soroban-testnet.stellar.org');
    });

    it('should use custom RPC URL when provided', () => {
      const customRpcUrl = 'https://custom-rpc.example.com';
      const testWallet = new CrossmintWallet({ ...config, rpcUrl: customRpcUrl });
      expect(testWallet.getRpcUrl()).toBe(customRpcUrl);
    });
  });

  describe('createWallet', () => {
    const createOptions: CreateWalletOptions = {
      signerType: 'ed25519',
    };

    it('should call correct API endpoint with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: 'GTEST', publicKey: 'GTEST', signers: [], policies: [] }),
      });

      await wallet.createWallet(createOptions);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      // Now uses 2022-06-09 legacy API
      expect(url).toBe('https://staging.crossmint.com/api/2022-06-09/wallets');
      expect(options.method).toBe('POST');
      expect(options.headers['X-API-KEY']).toBe('test-api-key');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should send correct body with chain type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: 'GTEST', publicKey: 'GTEST', signers: [], policies: [] }),
      });

      await wallet.createWallet({ signerType: 'secp256r1' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.chain).toBe('stellar-testnet');
      expect(body.type).toBe('custodial');
    });

    it('should add network to response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: 'GTEST', publicKey: 'GTEST', signers: [], policies: [] }),
      });

      const result = await wallet.createWallet(createOptions);
      expect(result.network).toBe('testnet');
    });

    it('should throw WalletError with API error message on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request parameters' }),
      });

      try {
        await wallet.createWallet(createOptions);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(WalletError);
        expect((e as Error).message).toBe('Invalid request parameters');
      }
    });

    it('should throw WalletError with default message when API returns no error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      await expect(wallet.createWallet(createOptions)).rejects.toThrow('Failed to create wallet');
    });

    it('should wrap network errors in WalletError', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(wallet.createWallet(createOptions)).rejects.toThrow(WalletError);
    });
  });

  describe('getWallet', () => {
    it('should call correct API endpoint with wallet locator', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: 'GADDR123', publicKey: 'GADDR123', signers: [], policies: [] }),
      });

      await wallet.getWallet('GADDR123');

      const [url] = mockFetch.mock.calls[0];
      // Uses v1-alpha2 with wallet locator format
      expect(url).toBe('https://staging.crossmint.com/api/v1-alpha2/wallets/stellar-testnet:GADDR123');
    });

    it('should throw WalletError with WALLET_NOT_FOUND code on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Wallet not found' }),
      });

      try {
        await wallet.getWallet('NONEXISTENT');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(WalletError);
        expect((e as WalletError).code).toBe('WALLET_NOT_FOUND');
      }
    });
  });

  describe('addSigner', () => {
    const signerConfig = {
      type: 'ed25519' as const,
      publicKey: 'GDNEWSIGNER12345',
      role: 'standard' as const,
    };

    it('should call correct endpoint with POST method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, hash: 'txhash' }),
      });

      await wallet.addSigner('GADDR123', signerConfig);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://staging.crossmint.com/api/v1-alpha2/wallets/stellar-testnet:GADDR123/signers');
      expect(options.method).toBe('POST');
    });

    it('should send signer config in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, hash: 'txhash' }),
      });

      await wallet.addSigner('GADDR123', signerConfig);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.type).toBe('ed25519');
      expect(body.publicKey).toBe('GDNEWSIGNER12345');
      expect(body.role).toBe('standard');
    });
  });

  describe('removeSigner', () => {
    it('should call correct endpoint with DELETE method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, hash: 'txhash' }),
      });

      await wallet.removeSigner('GADDR123', 'GSIGNER456');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://staging.crossmint.com/api/v1-alpha2/wallets/stellar-testnet:GADDR123/signers/GSIGNER456');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('signTransaction', () => {
    it('should send transaction to transactions endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ signedXdr: 'SIGNED', publicKey: 'GPUB' }),
      });

      await wallet.signTransaction('ORIGINAL_XDR');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://staging.crossmint.com/api/v1-alpha2/wallets/stellar-testnet/transactions');
      const body = JSON.parse(options.body);
      expect(body.transaction).toBe('ORIGINAL_XDR');
    });

    it('should pass signerPublicKey if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ signedXdr: 'SIGNED', publicKey: 'GPUB' }),
      });

      await wallet.signTransaction('ORIGINAL_XDR', 'GSPECIFIC_SIGNER');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.signerPublicKey).toBe('GSPECIFIC_SIGNER');
    });
  });

  describe('executeTransaction', () => {
    it('should sign then submit transaction', async () => {
      // Mock sign
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ signedXdr: 'SIGNED_XDR', publicKey: 'GPUB' }),
      });
      // Mock submit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, hash: 'txhash', ledger: 123 }),
      });

      const result = await wallet.executeTransaction('ORIGINAL_XDR');

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should be sign (transactions endpoint)
      expect(mockFetch.mock.calls[0][0]).toContain('/transactions');

      // Second call should also be transactions endpoint with submit flag
      const [submitUrl, submitOptions] = mockFetch.mock.calls[1];
      expect(submitUrl).toContain('/transactions');
      const submitBody = JSON.parse(submitOptions.body);
      expect(submitBody.transaction).toBe('SIGNED_XDR');
      expect(submitBody.submit).toBe(true);

      expect(result.success).toBe(true);
      expect(result.hash).toBe('txhash');
      expect(result.ledger).toBe(123);
    });

    it('should throw if sign fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid XDR' }),
      });

      await expect(wallet.executeTransaction('BAD_XDR')).rejects.toThrow(WalletError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not proceed to submit
    });
  });

  describe('getBalances', () => {
    it('should call correct endpoint with POST method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await wallet.getBalances('GADDR123');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://staging.crossmint.com/api/v1-alpha2/wallets/stellar-testnet:GADDR123/balances');
      expect(options.method).toBe('POST');
    });
  });
});
