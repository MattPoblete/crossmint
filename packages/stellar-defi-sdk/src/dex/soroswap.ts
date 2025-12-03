import {
  SoroswapSDK,
  TradeType as SoroswapTradeType,
  SupportedNetworks,
  SupportedProtocols,
} from '@soroswap/sdk';

import { DexError, ErrorCodes } from '../errors';
import { getContracts } from '../config/contracts';
import { getNetworkConfig, type Network } from '../config/networks';

import type {
  AddLiquidityParams,
  DexConfig,
  IDex,
  Pool,
  Quote,
  QuoteParams,
  RemoveLiquidityParams,
  SwapParams,
} from './types';

/**
 * Soroswap DEX implementation for Stellar/Soroban
 */
export class SoroswapDex implements IDex {
  private readonly network: Network;
  private readonly rpcUrl: string;
  private readonly routerAddress: string;
  private readonly factoryAddress: string;
  private readonly soroswapSdk: SoroswapSDK;

  constructor(config: DexConfig) {
    this.network = config.network;

    const networkConfig = getNetworkConfig(config.network, config.rpcUrl);
    this.rpcUrl = networkConfig.rpcUrl;

    const contracts = getContracts(config.network);
    this.routerAddress = contracts.soroswap.router;
    this.factoryAddress = contracts.soroswap.factory;

    this.soroswapSdk = new SoroswapSDK({
      apiKey: config.apiKey,
      defaultNetwork:
        config.network === 'mainnet' ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });
    console.log('SoroswapDex initialized with network:', this.network);
  }

  /**
   * Get current network
   */
  getNetwork(): Network {
    return this.network;
  }

  /**
   * Get RPC URL
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Get a swap quote using Soroswap SDK
   */
  async getQuote(params: QuoteParams): Promise<Quote> {
    if (!this.isValidAddress(params.tokenIn) || !this.isValidAddress(params.tokenOut)) {
      throw new DexError('Invalid token address', ErrorCodes.INVALID_TOKEN);
    }

    try {
      const quoteResponse = await this.soroswapSdk.quote({
        assetIn: params.tokenIn,
        assetOut: params.tokenOut,
        amount: params.amount,
        tradeType:
          params.tradeType === 'EXACT_IN' ? SoroswapTradeType.EXACT_IN : SoroswapTradeType.EXACT_OUT,
        protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA, SupportedProtocols.PHOENIX],
      });

      const amountIn =
        params.tradeType === 'EXACT_IN' ? params.amount : BigInt(quoteResponse.amountIn);
      const amountOut =
        params.tradeType === 'EXACT_OUT' ? params.amount : BigInt(quoteResponse.amountOut);

      return {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn,
        amountOut,
        priceImpact: parseFloat(quoteResponse.priceImpactPct) || 0,
        route: this.extractRoute(quoteResponse.routePlan, params.tokenIn, params.tokenOut),
        minimumReceived:
          params.tradeType === 'EXACT_IN' ? this.applySlippage(amountOut, 100) : undefined,
        maximumSent:
          params.tradeType === 'EXACT_OUT' ? this.applySlippageMax(amountIn, 100) : undefined,
      };
    } catch (error) {
      if (error instanceof DexError) throw error;

      throw new DexError(
        `Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCodes.INSUFFICIENT_LIQUIDITY,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build swap transaction XDR
   */
  async buildSwapTransaction(params: SwapParams): Promise<string> {
    try {
      // Validate inputs
      if (!this.isValidAddress(params.tokenIn) || !this.isValidAddress(params.tokenOut)) {
        throw new DexError('Invalid token address', ErrorCodes.INVALID_TOKEN);
      }

      // Get quote first
      const quote = await this.getQuote({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amount: params.amount,
        tradeType: params.tradeType,
      });

      // Calculate minimum/maximum amounts with slippage
      const slippageBps = params.slippageBps ?? 100; // Default 1%
      const minAmountOut = params.tradeType === 'EXACT_IN'
        ? this.applySlippage(quote.amountOut, slippageBps)
        : quote.amountOut;
      const maxAmountIn = params.tradeType === 'EXACT_OUT'
        ? this.applySlippageMax(quote.amountIn, slippageBps)
        : quote.amountIn;

      // In a real implementation, this would build the actual transaction
      // using @soroswap/sdk or direct contract calls
      // For now, return a placeholder XDR
      const txData = {
        type: params.tradeType === 'EXACT_IN' ? 'swap_exact_tokens_for_tokens' : 'swap_tokens_for_exact_tokens',
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.tradeType === 'EXACT_IN' ? params.amount.toString() : maxAmountIn.toString(),
        amountOut: params.tradeType === 'EXACT_OUT' ? params.amount.toString() : minAmountOut.toString(),
        path: quote.route,
        to: params.sourceAddress,
        deadline: params.deadline ?? Math.floor(Date.now() / 1000) + 1800, // 30 min default
      };

      // Return base64 encoded transaction data as placeholder
      return Buffer.from(JSON.stringify(txData)).toString('base64');
    } catch (error) {
      if (error instanceof DexError) {
        throw error;
      }
      throw new DexError(
        'Failed to build swap transaction',
        ErrorCodes.SWAP_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get all available pools
   */
  async getPools(): Promise<Pool[]> {
    try {
      // In a real implementation, this would query the factory contract
      // to get all pair addresses and their details
      return [];
    } catch (error) {
      throw new DexError(
        'Failed to get pools',
        ErrorCodes.POOL_NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get pool by token pair
   */
  async getPool(tokenA: string, tokenB: string): Promise<Pool | null> {
    try {
      // Validate addresses
      if (!this.isValidAddress(tokenA) || !this.isValidAddress(tokenB)) {
        return null;
      }

      // In a real implementation, this would:
      // 1. Call factory.get_pair(tokenA, tokenB)
      // 2. Get reserves and other pool info
      return null;
    } catch (error) {
      throw new DexError(
        'Failed to get pool',
        ErrorCodes.POOL_NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(token: string, address: string): Promise<bigint> {
    try {
      // In a real implementation, this would call the token contract's balance method
      return 0n;
    } catch (error) {
      throw new DexError(
        'Failed to get token balance',
        ErrorCodes.INVALID_TOKEN,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build add liquidity transaction XDR
   */
  async buildAddLiquidityTransaction(params: AddLiquidityParams): Promise<string> {
    try {
      const slippageBps = params.slippageBps ?? 100;
      const minAmountA = this.applySlippage(params.amountA, slippageBps);
      const minAmountB = this.applySlippage(params.amountB, slippageBps);

      const txData = {
        type: 'add_liquidity',
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amountADesired: params.amountA.toString(),
        amountBDesired: params.amountB.toString(),
        amountAMin: minAmountA.toString(),
        amountBMin: minAmountB.toString(),
        to: params.sourceAddress,
        deadline: Math.floor(Date.now() / 1000) + 1800,
      };

      return Buffer.from(JSON.stringify(txData)).toString('base64');
    } catch (error) {
      throw new DexError(
        'Failed to build add liquidity transaction',
        ErrorCodes.SWAP_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build remove liquidity transaction XDR
   */
  async buildRemoveLiquidityTransaction(params: RemoveLiquidityParams): Promise<string> {
    try {
      const txData = {
        type: 'remove_liquidity',
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        liquidity: params.lpAmount.toString(),
        amountAMin: (params.minAmountA ?? 0n).toString(),
        amountBMin: (params.minAmountB ?? 0n).toString(),
        to: params.sourceAddress,
        deadline: Math.floor(Date.now() / 1000) + 1800,
      };

      return Buffer.from(JSON.stringify(txData)).toString('base64');
    } catch (error) {
      throw new DexError(
        'Failed to build remove liquidity transaction',
        ErrorCodes.SWAP_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Private helper methods

  private isValidAddress(address: string): boolean {
    // Stellar contract addresses start with 'C' and are 56 characters
    return address.length === 56 && address.startsWith('C');
  }

  private extractRoute(
    routePlan: Array<{ swapInfo: { path: string[] }; percent: string }> | undefined,
    tokenIn: string,
    tokenOut: string
  ): string[] {
    if (!routePlan || routePlan.length === 0) {
      return [tokenIn, tokenOut];
    }

    const route: string[] = [];
    for (const step of routePlan) {
      for (const asset of step.swapInfo.path) {
        if (!route.includes(asset)) {
          route.push(asset);
        }
      }
    }
    return route.length > 0 ? route : [tokenIn, tokenOut];
  }

  private applySlippage(amount: bigint, slippageBps: number): bigint {
    // Apply slippage tolerance (minimum received)
    return (amount * BigInt(10000 - slippageBps)) / 10000n;
  }

  private applySlippageMax(amount: bigint, slippageBps: number): bigint {
    // Apply slippage tolerance (maximum sent)
    return (amount * BigInt(10000 + slippageBps)) / 10000n;
  }
}
