import { describe, it, expect, beforeEach } from 'vitest';

import { SoroswapDex } from '../soroswap';
import type { DexConfig, QuoteParams, SwapParams } from '../types';
import { DexError } from '../../errors';

describe('SoroswapDex', () => {
  let dex: SoroswapDex;
  const config: DexConfig = {
    network: 'testnet',
  };

  // Valid Stellar contract addresses (56 chars, starts with C)
  const VALID_TOKEN_A = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const VALID_TOKEN_B = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

  beforeEach(() => {
    dex = new SoroswapDex(config);
  });

  describe('constructor', () => {
    it('should create instance with testnet config', () => {
      expect(dex).toBeInstanceOf(SoroswapDex);
      expect(dex.getNetwork()).toBe('testnet');
    });

    it('should create instance with mainnet config', () => {
      const mainnetDex = new SoroswapDex({ network: 'mainnet' });
      expect(mainnetDex.getNetwork()).toBe('mainnet');
    });

    it('should use default RPC URL for network', () => {
      expect(dex.getRpcUrl()).toBe('https://soroban-testnet.stellar.org');
    });

    it('should use custom RPC URL when provided', () => {
      const customDex = new SoroswapDex({ network: 'testnet', rpcUrl: 'https://custom.rpc' });
      expect(customDex.getRpcUrl()).toBe('https://custom.rpc');
    });
  });

  describe('getQuote', () => {
    describe('address validation', () => {
      it('should reject invalid tokenIn address (too short)', async () => {
        const params: QuoteParams = {
          tokenIn: 'CINVALID',
          tokenOut: VALID_TOKEN_B,
          amount: 1000n,
          tradeType: 'EXACT_IN',
        };

        await expect(dex.getQuote(params)).rejects.toThrow(DexError);
      });

      it('should reject invalid tokenIn address (wrong prefix)', async () => {
        const params: QuoteParams = {
          tokenIn: 'GDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // G instead of C
          tokenOut: VALID_TOKEN_B,
          amount: 1000n,
          tradeType: 'EXACT_IN',
        };

        await expect(dex.getQuote(params)).rejects.toThrow(DexError);
      });

      it('should reject invalid tokenOut address', async () => {
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: 'NOT_A_VALID_ADDRESS',
          amount: 1000n,
          tradeType: 'EXACT_IN',
        };

        await expect(dex.getQuote(params)).rejects.toThrow(DexError);
      });
    });

    describe('EXACT_IN quotes', () => {
      it('should return amountIn equal to input amount', async () => {
        const inputAmount = 1000000000n; // 100 with 7 decimals
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: inputAmount,
          tradeType: 'EXACT_IN',
        };

        const quote = await dex.getQuote(params);

        expect(quote.amountIn).toBe(inputAmount);
        expect(quote.tokenIn).toBe(VALID_TOKEN_A);
        expect(quote.tokenOut).toBe(VALID_TOKEN_B);
      });

      it('should calculate amountOut with fee deduction (0.3%)', async () => {
        const inputAmount = 1000000000n;
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: inputAmount,
          tradeType: 'EXACT_IN',
        };

        const quote = await dex.getQuote(params);

        // Output should be less than input due to 0.3% fee
        // amountOut = amountIn * 997 / 1000
        const expectedOut = (inputAmount * 997n) / 1000n;
        expect(quote.amountOut).toBe(expectedOut);
      });

      it('should include route with at least tokenIn and tokenOut', async () => {
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: 1000n,
          tradeType: 'EXACT_IN',
        };

        const quote = await dex.getQuote(params);

        expect(quote.route).toContain(VALID_TOKEN_A);
        expect(quote.route).toContain(VALID_TOKEN_B);
        expect(quote.route.length).toBeGreaterThanOrEqual(2);
      });

      it('should calculate minimumReceived for slippage protection', async () => {
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: 1000000000n,
          tradeType: 'EXACT_IN',
        };

        const quote = await dex.getQuote(params);

        expect(quote.minimumReceived).toBeDefined();
        // minimumReceived should be less than amountOut (1% default slippage)
        expect(quote.minimumReceived!).toBeLessThan(quote.amountOut);
      });
    });

    describe('EXACT_OUT quotes', () => {
      it('should return amountOut equal to input amount', async () => {
        const outputAmount = 1000000000n;
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: outputAmount,
          tradeType: 'EXACT_OUT',
        };

        const quote = await dex.getQuote(params);

        expect(quote.amountOut).toBe(outputAmount);
      });

      it('should calculate amountIn with fee addition', async () => {
        const outputAmount = 997000000n; // What we want out
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: outputAmount,
          tradeType: 'EXACT_OUT',
        };

        const quote = await dex.getQuote(params);

        // amountIn should be more than amountOut due to fee
        expect(quote.amountIn).toBeGreaterThan(quote.amountOut);
      });

      it('should include maximumSent for slippage protection', async () => {
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: 1000000000n,
          tradeType: 'EXACT_OUT',
        };

        const quote = await dex.getQuote(params);

        expect(quote.maximumSent).toBeDefined();
        // maximumSent should be more than amountIn
        expect(quote.maximumSent!).toBeGreaterThan(quote.amountIn);
      });
    });

    describe('price impact', () => {
      it('should return non-negative price impact', async () => {
        const params: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: 1000n,
          tradeType: 'EXACT_IN',
        };

        const quote = await dex.getQuote(params);

        expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
      });

      it('should increase price impact for larger amounts', async () => {
        const smallParams: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: 1000n,
          tradeType: 'EXACT_IN',
        };

        const largeParams: QuoteParams = {
          tokenIn: VALID_TOKEN_A,
          tokenOut: VALID_TOKEN_B,
          amount: 1000000000000n, // Much larger
          tradeType: 'EXACT_IN',
        };

        const smallQuote = await dex.getQuote(smallParams);
        const largeQuote = await dex.getQuote(largeParams);

        expect(largeQuote.priceImpact).toBeGreaterThan(smallQuote.priceImpact);
      });
    });
  });

  describe('buildSwapTransaction', () => {
    const baseSwapParams: SwapParams = {
      tokenIn: VALID_TOKEN_A,
      tokenOut: VALID_TOKEN_B,
      amount: 1000000000n,
      tradeType: 'EXACT_IN',
      sourceAddress: 'GDTEST123456789',
    };

    it('should reject invalid token addresses', async () => {
      const invalidParams = { ...baseSwapParams, tokenIn: 'INVALID' };
      await expect(dex.buildSwapTransaction(invalidParams)).rejects.toThrow(DexError);
    });

    it('should return base64 encoded transaction data', async () => {
      const txXdr = await dex.buildSwapTransaction(baseSwapParams);

      expect(txXdr).toBeDefined();
      expect(typeof txXdr).toBe('string');

      // Should be valid base64
      const decoded = Buffer.from(txXdr, 'base64').toString();
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should include correct swap type in transaction', async () => {
      const txXdr = await dex.buildSwapTransaction(baseSwapParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.type).toBe('swap_exact_tokens_for_tokens');
    });

    it('should use swap_tokens_for_exact_tokens for EXACT_OUT', async () => {
      const exactOutParams = { ...baseSwapParams, tradeType: 'EXACT_OUT' as const };
      const txXdr = await dex.buildSwapTransaction(exactOutParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.type).toBe('swap_tokens_for_exact_tokens');
    });

    describe('slippage calculation', () => {
      it('should apply default 1% slippage when not specified', async () => {
        const txXdr = await dex.buildSwapTransaction(baseSwapParams);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        // For EXACT_IN, amountOut should be reduced by slippage
        const expectedMinOut = (997000000n * 9900n) / 10000n; // 997M * 99%
        expect(BigInt(decoded.amountOut)).toBe(expectedMinOut);
      });

      it('should apply custom slippage when specified', async () => {
        const paramsWithSlippage = { ...baseSwapParams, slippageBps: 200 }; // 2%
        const txXdr = await dex.buildSwapTransaction(paramsWithSlippage);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        // 2% slippage means 98% of expected output
        const expectedMinOut = (997000000n * 9800n) / 10000n; // 997M * 98%
        expect(BigInt(decoded.amountOut)).toBe(expectedMinOut);
      });

      it('should apply slippage to amountIn for EXACT_OUT trades', async () => {
        const exactOutParams: SwapParams = {
          ...baseSwapParams,
          tradeType: 'EXACT_OUT',
          slippageBps: 100,
        };
        const txXdr = await dex.buildSwapTransaction(exactOutParams);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        // For EXACT_OUT, amountIn should be increased by slippage
        const baseAmountIn = (1000000000n * 1000n) / 997n + 1n;
        const expectedMaxIn = (baseAmountIn * 10100n) / 10000n;
        expect(BigInt(decoded.amountIn)).toBe(expectedMaxIn);
      });
    });

    describe('deadline', () => {
      it('should use default 30 minute deadline when not specified', async () => {
        const beforeTime = Math.floor(Date.now() / 1000);
        const txXdr = await dex.buildSwapTransaction(baseSwapParams);
        const afterTime = Math.floor(Date.now() / 1000);

        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        // Default deadline is 30 minutes (1800 seconds) from now
        expect(decoded.deadline).toBeGreaterThanOrEqual(beforeTime + 1800);
        expect(decoded.deadline).toBeLessThanOrEqual(afterTime + 1800 + 1);
      });

      it('should use custom deadline when specified', async () => {
        const customDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        const paramsWithDeadline = { ...baseSwapParams, deadline: customDeadline };
        const txXdr = await dex.buildSwapTransaction(paramsWithDeadline);
        const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

        expect(decoded.deadline).toBe(customDeadline);
      });
    });

    it('should include path from quote', async () => {
      const txXdr = await dex.buildSwapTransaction(baseSwapParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.path).toContain(VALID_TOKEN_A);
      expect(decoded.path).toContain(VALID_TOKEN_B);
    });

    it('should set recipient to sourceAddress', async () => {
      const txXdr = await dex.buildSwapTransaction(baseSwapParams);
      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.to).toBe('GDTEST123456789');
    });
  });

  describe('getPools', () => {
    it('should return an array', async () => {
      const pools = await dex.getPools();
      expect(Array.isArray(pools)).toBe(true);
    });
  });

  describe('getPool', () => {
    it('should return null for invalid addresses', async () => {
      const pool = await dex.getPool('INVALID', 'ALSO_INVALID');
      expect(pool).toBeNull();
    });

    it('should return null for non-existent pool with valid addresses', async () => {
      const pool = await dex.getPool(VALID_TOKEN_A, VALID_TOKEN_B);
      // Currently returns null as we don't have real pool data
      expect(pool).toBeNull();
    });
  });

  describe('getTokenBalance', () => {
    it('should return bigint balance', async () => {
      const balance = await dex.getTokenBalance(VALID_TOKEN_A, 'GDTEST123');
      expect(typeof balance).toBe('bigint');
      expect(balance).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('buildAddLiquidityTransaction', () => {
    it('should build valid transaction data', async () => {
      const txXdr = await dex.buildAddLiquidityTransaction({
        tokenA: VALID_TOKEN_A,
        tokenB: VALID_TOKEN_B,
        amountA: 1000000000n,
        amountB: 2000000000n,
        sourceAddress: 'GDTEST123',
      });

      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.type).toBe('add_liquidity');
      expect(decoded.tokenA).toBe(VALID_TOKEN_A);
      expect(decoded.tokenB).toBe(VALID_TOKEN_B);
      expect(decoded.amountADesired).toBe('1000000000');
      expect(decoded.amountBDesired).toBe('2000000000');
    });

    it('should apply slippage to minimum amounts', async () => {
      const txXdr = await dex.buildAddLiquidityTransaction({
        tokenA: VALID_TOKEN_A,
        tokenB: VALID_TOKEN_B,
        amountA: 1000000000n,
        amountB: 2000000000n,
        slippageBps: 100, // 1%
        sourceAddress: 'GDTEST123',
      });

      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      // Min should be 99% of desired
      expect(BigInt(decoded.amountAMin)).toBe(990000000n);
      expect(BigInt(decoded.amountBMin)).toBe(1980000000n);
    });
  });

  describe('buildRemoveLiquidityTransaction', () => {
    it('should build valid transaction data', async () => {
      const txXdr = await dex.buildRemoveLiquidityTransaction({
        tokenA: VALID_TOKEN_A,
        tokenB: VALID_TOKEN_B,
        lpAmount: 500000000n,
        sourceAddress: 'GDTEST123',
      });

      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.type).toBe('remove_liquidity');
      expect(decoded.liquidity).toBe('500000000');
      expect(decoded.to).toBe('GDTEST123');
    });

    it('should include minimum amounts when specified', async () => {
      const txXdr = await dex.buildRemoveLiquidityTransaction({
        tokenA: VALID_TOKEN_A,
        tokenB: VALID_TOKEN_B,
        lpAmount: 500000000n,
        minAmountA: 100000000n,
        minAmountB: 200000000n,
        sourceAddress: 'GDTEST123',
      });

      const decoded = JSON.parse(Buffer.from(txXdr, 'base64').toString());

      expect(decoded.amountAMin).toBe('100000000');
      expect(decoded.amountBMin).toBe('200000000');
    });
  });
});
