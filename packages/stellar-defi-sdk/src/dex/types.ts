import type { Network } from '../config/networks';

/**
 * Trade type for swaps
 */
export type TradeType = 'EXACT_IN' | 'EXACT_OUT';

/**
 * DEX configuration
 */
export interface DexConfig {
  network: Network;
  rpcUrl?: string;
  apiKey: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Quote parameters
 */
export interface QuoteParams {
  tokenIn: string;
  tokenOut: string;
  amount: bigint;
  tradeType: TradeType;
}

/**
 * Quote result
 */
export interface Quote {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  route: string[];
  minimumReceived?: bigint;
  maximumSent?: bigint;
}

/**
 * Swap parameters
 */
export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amount: bigint;
  tradeType: TradeType;
  slippageBps?: number;
  deadline?: number;
  sourceAddress: string;
}

/**
 * Swap result
 */
export interface SwapResult {
  success: boolean;
  hash: string;
  amountIn: bigint;
  amountOut: bigint;
}

/**
 * Liquidity parameters
 */
export interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  slippageBps?: number;
  sourceAddress: string;
}

/**
 * Remove liquidity parameters
 */
export interface RemoveLiquidityParams {
  tokenA: string;
  tokenB: string;
  lpAmount: bigint;
  minAmountA?: bigint;
  minAmountB?: bigint;
  sourceAddress: string;
}

/**
 * Liquidity result
 */
export interface LiquidityResult {
  success: boolean;
  hash: string;
  lpTokensMinted?: bigint;
  lpTokensBurned?: bigint;
  amountA: bigint;
  amountB: bigint;
}

/**
 * Pool information
 */
export interface Pool {
  address: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: bigint;
  reserveB: bigint;
  totalShares: bigint;
  fee: number;
}

/**
 * Interface for DEX operations
 */
export interface IDex {
  /**
   * Get a swap quote
   */
  getQuote(params: QuoteParams): Promise<Quote>;

  /**
   * Build swap transaction XDR
   */
  buildSwapTransaction(params: SwapParams): Promise<string>;

  /**
   * Get all available pools
   */
  getPools(): Promise<Pool[]>;

  /**
   * Get pool by token pair
   */
  getPool(tokenA: string, tokenB: string): Promise<Pool | null>;

  /**
   * Get token balance for an address
   */
  getTokenBalance(token: string, address: string): Promise<bigint>;

  /**
   * Build add liquidity transaction XDR
   */
  buildAddLiquidityTransaction(params: AddLiquidityParams): Promise<string>;

  /**
   * Build remove liquidity transaction XDR
   */
  buildRemoveLiquidityTransaction(params: RemoveLiquidityParams): Promise<string>;
}
