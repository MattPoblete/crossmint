import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StellarDefiClient } from '../client';
import type { StellarDefiConfig } from '../client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the Stellar SDK
vi.mock('@stellar/stellar-sdk', () => ({
  SorobanRpc: {
    Server: vi.fn().mockImplementation(() => ({
      getAccount: vi.fn(),
      prepareTransaction: vi.fn(),
      sendTransaction: vi.fn(),
    })),
  },
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015',
  },
  Contract: vi.fn(),
  TransactionBuilder: vi.fn(),
}));

describe('StellarDefiClient', () => {
  const config: StellarDefiConfig = {
    network: 'testnet',
    crossmint: {
      apiKey: 'test-api-key',
    },
  };

  let client: StellarDefiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new StellarDefiClient(config);
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeInstanceOf(StellarDefiClient);
    });

    it('should throw error for missing crossmint API key', () => {
      expect(
        () =>
          new StellarDefiClient({
            network: 'testnet',
            crossmint: { apiKey: '' },
          })
      ).toThrow('API key is required');
    });

    it('should initialize all modules', () => {
      expect(client.wallet).toBeDefined();
      expect(client.dex).toBeDefined();
      expect(client.yield).toBeDefined();
    });
  });

  describe('modules', () => {
    it('should expose wallet module', () => {
      expect(client.wallet).toBeDefined();
      expect(typeof client.wallet.createWallet).toBe('function');
      expect(typeof client.wallet.getWallet).toBe('function');
    });

    it('should expose dex module', () => {
      expect(client.dex).toBeDefined();
      expect(typeof client.dex.getQuote).toBe('function');
      expect(typeof client.dex.buildSwapTransaction).toBe('function');
    });

    it('should expose yield module', () => {
      expect(client.yield).toBeDefined();
      expect(typeof client.yield.getVaults).toBe('function');
      expect(typeof client.yield.buildDepositTransaction).toBe('function');
    });
  });

  describe('network', () => {
    it('should return current network', () => {
      expect(client.getNetwork()).toBe('testnet');
    });

    it('should use mainnet when configured', () => {
      const mainnetClient = new StellarDefiClient({
        ...config,
        network: 'mainnet',
      });
      expect(mainnetClient.getNetwork()).toBe('mainnet');
    });
  });

  describe('swapAndDeposit', () => {
    it('should be defined', () => {
      expect(typeof client.swapAndDeposit).toBe('function');
    });

    it('should swap tokens and deposit to vault', async () => {
      // Mock wallet for transaction execution
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            signedXdr: 'SIGNED_XDR',
            publicKey: 'GDTEST123456789',
          }),
      });

      const result = await client.swapAndDeposit({
        sourceAddress: 'GDTEST123456789',
        tokenIn: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        tokenOut: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        amountIn: BigInt('1000000000'),
        vault: 'CDTESTVAULT123456789012345678901234567890123456789012345',
        slippageBps: 100,
      });

      expect(result).toBeDefined();
      expect(result.swapTxXdr).toBeDefined();
      expect(result.depositTxXdr).toBeDefined();
    });
  });

  describe('withdrawAndSwap', () => {
    it('should be defined', () => {
      expect(typeof client.withdrawAndSwap).toBe('function');
    });

    it('should withdraw from vault and swap tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            signedXdr: 'SIGNED_XDR',
            publicKey: 'GDTEST123456789',
          }),
      });

      const result = await client.withdrawAndSwap({
        sourceAddress: 'GDTEST123456789',
        vault: 'CDTESTVAULT123456789012345678901234567890123456789012345',
        shares: BigInt('500000000'),
        tokenOut: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        slippageBps: 100,
      });

      expect(result).toBeDefined();
      expect(result.withdrawTxXdr).toBeDefined();
    });
  });
});
