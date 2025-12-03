import { describe, it, expect, beforeEach } from 'vitest';

import { DefindexYield } from '../defindex';
import type { YieldConfig, DepositParams, WithdrawParams } from '../types';
import { YieldError } from '../../errors';

describe('DefindexYield', () => {
  let yieldClient: DefindexYield;
  const config: YieldConfig = {
    network: 'testnet',
  };

  // Valid Stellar contract addresses (56 chars, starts with C)
  const VALID_VAULT = 'CDTESTVAULT123456789012345678901234567890123456789012345';
  const VALID_TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

  beforeEach(() => {
    yieldClient = new DefindexYield(config);
  });

  describe('constructor', () => {
    it('should create instance with testnet config', () => {
      expect(yieldClient).toBeInstanceOf(DefindexYield);
      expect(yieldClient.getNetwork()).toBe('testnet');
    });

    it('should create instance with mainnet config', () => {
      const mainnetYield = new DefindexYield({ network: 'mainnet' });
      expect(mainnetYield.getNetwork()).toBe('mainnet');
    });

    it('should use default RPC URL for network', () => {
      expect(yieldClient.getRpcUrl()).toBe('https://soroban-testnet.stellar.org');
    });

    it('should use mainnet RPC URL for mainnet', () => {
      const mainnetYield = new DefindexYield({ network: 'mainnet' });
      expect(mainnetYield.getRpcUrl()).toBe('https://soroban.stellar.org');
    });

    it('should use custom RPC URL when provided', () => {
      const customYield = new DefindexYield({ network: 'testnet', rpcUrl: 'https://custom.rpc' });
      expect(customYield.getRpcUrl()).toBe('https://custom.rpc');
    });
  });

  describe('getVaults', () => {
    it('should return an array', async () => {
      const vaults = await yieldClient.getVaults();
      expect(Array.isArray(vaults)).toBe(true);
    });
  });

  describe('getVault', () => {
    describe('address validation', () => {
      it('should reject invalid vault address (too short)', async () => {
        await expect(yieldClient.getVault('CINVALID')).rejects.toThrow(YieldError);
      });

      it('should reject invalid vault address (wrong prefix)', async () => {
        // G prefix is for accounts, C prefix is for contracts
        await expect(
          yieldClient.getVault('GDTESTVAULT123456789012345678901234567890123456789012345')
        ).rejects.toThrow(YieldError);
      });

      it('should reject empty address', async () => {
        await expect(yieldClient.getVault('')).rejects.toThrow(YieldError);
      });
    });

    it('should return vault with correct address', async () => {
      const vault = await yieldClient.getVault(VALID_VAULT);
      expect(vault.address).toBe(VALID_VAULT);
    });

    it('should return vault with all required fields', async () => {
      const vault = await yieldClient.getVault(VALID_VAULT);

      expect(vault.name).toBeDefined();
      expect(vault.symbol).toBeDefined();
      expect(Array.isArray(vault.assets)).toBe(true);
      expect(Array.isArray(vault.strategies)).toBe(true);
      expect(typeof vault.tvl).toBe('bigint');
      expect(typeof vault.totalShares).toBe('bigint');
      expect(typeof vault.apy).toBe('number');
      expect(vault.manager).toBeDefined();
      expect(vault.emergencyManager).toBeDefined();
      expect(vault.feeReceiver).toBeDefined();
    });

    it('should return vault detail with fee information', async () => {
      const vault = await yieldClient.getVault(VALID_VAULT);

      expect(typeof vault.performanceFee).toBe('number');
      expect(typeof vault.managementFee).toBe('number');
      expect(vault.performanceFee).toBeGreaterThanOrEqual(0);
      expect(vault.managementFee).toBeGreaterThanOrEqual(0);
    });

    it('should return vault with at least one asset', async () => {
      const vault = await yieldClient.getVault(VALID_VAULT);

      expect(vault.assets.length).toBeGreaterThan(0);
      const asset = vault.assets[0];
      expect(asset.address).toBeDefined();
      expect(asset.symbol).toBeDefined();
      expect(typeof asset.decimals).toBe('number');
      expect(typeof asset.allocation).toBe('number');
    });

    it('should return vault with at least one strategy', async () => {
      const vault = await yieldClient.getVault(VALID_VAULT);

      expect(vault.strategies.length).toBeGreaterThan(0);
      const strategy = vault.strategies[0];
      expect(strategy.address).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.type).toBeDefined();
      expect(typeof strategy.allocation).toBe('number');
    });
  });

  describe('getVaultBalance', () => {
    it('should return balance with vault address', async () => {
      const balance = await yieldClient.getVaultBalance(VALID_VAULT, 'GDUSER123');

      expect(balance.vault).toBe(VALID_VAULT);
    });

    it('should return balance with bigint shares', async () => {
      const balance = await yieldClient.getVaultBalance(VALID_VAULT, 'GDUSER123');

      expect(typeof balance.shares).toBe('bigint');
      expect(balance.shares).toBeGreaterThanOrEqual(0n);
    });

    it('should return balance with bigint value', async () => {
      const balance = await yieldClient.getVaultBalance(VALID_VAULT, 'GDUSER123');

      expect(typeof balance.value).toBe('bigint');
      expect(balance.value).toBeGreaterThanOrEqual(0n);
    });

    it('should return balance with assets array', async () => {
      const balance = await yieldClient.getVaultBalance(VALID_VAULT, 'GDUSER123');

      expect(Array.isArray(balance.assets)).toBe(true);
    });
  });

  describe('getEstimatedAPY', () => {
    it('should return a number', async () => {
      const apy = await yieldClient.getEstimatedAPY(VALID_VAULT);
      expect(typeof apy).toBe('number');
    });

    it('should return non-negative APY', async () => {
      const apy = await yieldClient.getEstimatedAPY(VALID_VAULT);
      expect(apy).toBeGreaterThanOrEqual(0);
    });

    it('should throw for invalid vault address', async () => {
      await expect(yieldClient.getEstimatedAPY('INVALID')).rejects.toThrow(YieldError);
    });
  });

  describe('buildDepositTransaction', () => {
    const baseDepositParams: DepositParams = {
      vault: VALID_VAULT,
      amounts: [1000000000n],
      sourceAddress: 'GDTEST123456789',
    };

    describe('address validation', () => {
      it('should reject invalid vault address', async () => {
        const invalidParams = { ...baseDepositParams, vault: 'INVALID' };
        await expect(yieldClient.buildDepositTransaction(invalidParams)).rejects.toThrow(YieldError);
      });

      it('should reject vault address with wrong prefix', async () => {
        const invalidParams = {
          ...baseDepositParams,
          vault: 'GDTESTVAULT123456789012345678901234567890123456789012345',
        };
        await expect(yieldClient.buildDepositTransaction(invalidParams)).rejects.toThrow(YieldError);
      });
    });

    it('should return base64 encoded transaction data', async () => {
      const txXdr = await yieldClient.buildDepositTransaction(baseDepositParams);

      expect(txXdr).toBeDefined();
      expect(typeof txXdr).toBe('string');

      // Should be valid base64
      const decoded = Buffer.from(txXdr, 'base64').toString();
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should include deposit type in transaction', async () => {
      const txXdr = await yieldClient.buildDepositTransaction(baseDepositParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.type).toBe('deposit');
    });

    it('should include vault address in transaction', async () => {
      const txXdr = await yieldClient.buildDepositTransaction(baseDepositParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.vault).toBe(VALID_VAULT);
    });

    it('should include amounts as string array', async () => {
      const params = { ...baseDepositParams, amounts: [1000000000n, 2000000000n] };
      const txXdr = await yieldClient.buildDepositTransaction(params);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.amounts).toEqual(['1000000000', '2000000000']);
    });

    it('should include source address as recipient', async () => {
      const txXdr = await yieldClient.buildDepositTransaction(baseDepositParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.to).toBe('GDTEST123456789');
    });

    describe('invest option', () => {
      it('should default invest to false', async () => {
        const txXdr = await yieldClient.buildDepositTransaction(baseDepositParams);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.invest).toBe(false);
      });

      it('should set invest to true when specified', async () => {
        const paramsWithInvest = { ...baseDepositParams, invest: true };
        const txXdr = await yieldClient.buildDepositTransaction(paramsWithInvest);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.invest).toBe(true);
      });
    });

    describe('slippage', () => {
      it('should include default slippage when not specified', async () => {
        const txXdr = await yieldClient.buildDepositTransaction(baseDepositParams);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.slippageBps).toBe(100); // Default 1%
      });

      it('should include custom slippage when specified', async () => {
        const paramsWithSlippage = { ...baseDepositParams, slippageBps: 50 };
        const txXdr = await yieldClient.buildDepositTransaction(paramsWithSlippage);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.slippageBps).toBe(50);
      });
    });
  });

  describe('buildWithdrawTransaction', () => {
    const baseWithdrawParams: WithdrawParams = {
      vault: VALID_VAULT,
      shares: 500000000n,
      sourceAddress: 'GDTEST123456789',
    };

    describe('address validation', () => {
      it('should reject invalid vault address', async () => {
        const invalidParams = { ...baseWithdrawParams, vault: 'INVALID' };
        await expect(yieldClient.buildWithdrawTransaction(invalidParams)).rejects.toThrow(YieldError);
      });
    });

    it('should return base64 encoded transaction data', async () => {
      const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);

      expect(txXdr).toBeDefined();
      expect(typeof txXdr).toBe('string');

      const decoded = Buffer.from(txXdr, 'base64').toString();
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should include withdraw type in transaction', async () => {
      const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.type).toBe('withdraw');
    });

    it('should include vault address', async () => {
      const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.vault).toBe(VALID_VAULT);
    });

    it('should include shares as string', async () => {
      const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.shares).toBe('500000000');
    });

    it('should include source address as recipient', async () => {
      const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.to).toBe('GDTEST123456789');
    });

    describe('withdrawAssets option', () => {
      it('should default to empty array', async () => {
        const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.withdrawAssets).toEqual([]);
      });

      it('should include specific assets when provided', async () => {
        const paramsWithAssets: WithdrawParams = {
          ...baseWithdrawParams,
          withdrawAssets: [VALID_TOKEN],
        };
        const txXdr = await yieldClient.buildWithdrawTransaction(paramsWithAssets);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.withdrawAssets).toContain(VALID_TOKEN);
      });
    });

    describe('slippage', () => {
      it('should include default slippage', async () => {
        const txXdr = await yieldClient.buildWithdrawTransaction(baseWithdrawParams);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.slippageBps).toBe(100);
      });

      it('should include custom slippage', async () => {
        const paramsWithSlippage = { ...baseWithdrawParams, slippageBps: 200 };
        const txXdr = await yieldClient.buildWithdrawTransaction(paramsWithSlippage);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.slippageBps).toBe(200);
      });
    });
  });
});
