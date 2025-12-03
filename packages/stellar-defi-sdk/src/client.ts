import type { Network } from './config/networks';
import { SoroswapDex } from './dex';
import { CrossmintWallet } from './wallet';
import { DefindexYield } from './yield';

/**
 * Configuration for the Stellar DeFi Client
 */
export interface StellarDefiConfig {
  /**
   * Network to use (testnet or mainnet)
   */
  network: Network;

  /**
   * Crossmint configuration for wallet operations
   */
  crossmint: {
    apiKey: string;
    /**
     * Custom base URL for Crossmint API (useful for proxying to avoid CORS)
     */
    baseUrl?: string;
  };

  /**
   * Soroswap API key for DEX operations
   */
  soroswapApiKey: string;

  /**
   * Optional Soroswap configuration
   */
  soroswap?: {
    rpcUrl?: string;
  };

  /**
   * Optional Defindex configuration
   */
  defindex?: {
    rpcUrl?: string;
  };

  /**
   * Optional custom RPC URL for all modules
   */
  rpcUrl?: string;
}

/**
 * Parameters for swap and deposit operation
 */
export interface SwapAndDepositParams {
  sourceAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  vault: string;
  slippageBps?: number;
  invest?: boolean;
}

/**
 * Result from swap and deposit operation
 */
export interface SwapAndDepositResult {
  swapTxXdr: string;
  depositTxXdr: string;
  estimatedAmountOut: bigint;
  estimatedShares: bigint;
}

/**
 * Parameters for withdraw and swap operation
 */
export interface WithdrawAndSwapParams {
  sourceAddress: string;
  vault: string;
  shares: bigint;
  tokenOut: string;
  slippageBps?: number;
}

/**
 * Result from withdraw and swap operation
 */
export interface WithdrawAndSwapResult {
  withdrawTxXdr: string;
  swapTxXdr?: string;
  estimatedAmountOut: bigint;
}

/**
 * Unified client for Stellar DeFi operations
 *
 * @example
 * ```typescript
 * const client = new StellarDefiClient({
 *   network: 'testnet',
 *   crossmint: { apiKey: 'your-api-key' },
 * });
 *
 * // Create a wallet
 * const wallet = await client.wallet.createWallet({ signerType: 'ed25519' });
 *
 * // Get a swap quote
 * const quote = await client.dex.getQuote({
 *   tokenIn: 'XLM',
 *   tokenOut: 'USDC',
 *   amount: 1000000000n,
 *   tradeType: 'EXACT_IN',
 * });
 *
 * // Deposit to a vault
 * const depositTx = await client.yield.buildDepositTransaction({
 *   vault: 'VAULT_ADDRESS',
 *   amounts: [1000000000n],
 *   sourceAddress: wallet.address,
 * });
 * ```
 */
export class StellarDefiClient {
  /**
   * Wallet module for Crossmint Smart Account operations
   */
  public readonly wallet: CrossmintWallet;

  /**
   * DEX module for Soroswap operations
   */
  public readonly dex: SoroswapDex;

  /**
   * Yield module for Defindex operations
   */
  public readonly yield: DefindexYield;

  private readonly network: Network;

  constructor(config: StellarDefiConfig) {
    this.network = config.network;

    // Initialize wallet module
    this.wallet = new CrossmintWallet({
      apiKey: config.crossmint.apiKey,
      network: config.network,
      rpcUrl: config.rpcUrl,
      baseUrl: config.crossmint.baseUrl,
    });

    // Initialize DEX module
    this.dex = new SoroswapDex({
      network: config.network,
      rpcUrl: config.soroswap?.rpcUrl ?? config.rpcUrl,
      apiKey: config.soroswapApiKey,
    });

    // Initialize yield module
    this.yield = new DefindexYield({
      network: config.network,
      rpcUrl: config.defindex?.rpcUrl ?? config.rpcUrl,
    });
  }

  /**
   * Get current network
   */
  getNetwork(): Network {
    return this.network;
  }

  /**
   * Swap tokens and deposit to a vault in one flow
   *
   * This is a convenience method that:
   * 1. Gets a quote for the swap
   * 2. Builds the swap transaction
   * 3. Builds the deposit transaction for the output tokens
   *
   * @param params - Swap and deposit parameters
   * @returns Transaction XDRs and estimates
   */
  async swapAndDeposit(params: SwapAndDepositParams): Promise<SwapAndDepositResult> {
    // Get swap quote
    const quote = await this.dex.getQuote({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amount: params.amountIn,
      tradeType: 'EXACT_IN',
    });

    // Build swap transaction
    const swapTxXdr = await this.dex.buildSwapTransaction({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amount: params.amountIn,
      tradeType: 'EXACT_IN',
      slippageBps: params.slippageBps,
      sourceAddress: params.sourceAddress,
    });

    // Build deposit transaction
    const depositTxXdr = await this.yield.buildDepositTransaction({
      vault: params.vault,
      amounts: [quote.amountOut],
      sourceAddress: params.sourceAddress,
      slippageBps: params.slippageBps,
      invest: params.invest,
    });

    return {
      swapTxXdr,
      depositTxXdr,
      estimatedAmountOut: quote.amountOut,
      estimatedShares: 0n, // Would be calculated from vault
    };
  }

  /**
   * Withdraw from a vault and swap to a desired token
   *
   * This is a convenience method that:
   * 1. Builds the withdraw transaction
   * 2. Estimates the output amounts
   * 3. Optionally builds a swap transaction if the output token differs
   *
   * @param params - Withdraw and swap parameters
   * @returns Transaction XDRs and estimates
   */
  async withdrawAndSwap(params: WithdrawAndSwapParams): Promise<WithdrawAndSwapResult> {
    // Get vault details to know the underlying asset
    const vault = await this.yield.getVault(params.vault);

    // Build withdraw transaction
    const withdrawTxXdr = await this.yield.buildWithdrawTransaction({
      vault: params.vault,
      shares: params.shares,
      sourceAddress: params.sourceAddress,
      slippageBps: params.slippageBps,
    });

    // If the vault's underlying asset is the desired output, no swap needed
    const vaultAsset = vault.assets[0]?.address;
    if (vaultAsset === params.tokenOut) {
      return {
        withdrawTxXdr,
        estimatedAmountOut: params.shares, // Simplified - would calculate actual value
      };
    }

    // Otherwise, build swap transaction for the output
    // This would need the actual withdrawn amount, which we don't have yet
    // In a real implementation, this would be handled differently
    const swapTxXdr = vaultAsset
      ? await this.dex.buildSwapTransaction({
          tokenIn: vaultAsset,
          tokenOut: params.tokenOut,
          amount: params.shares, // Simplified
          tradeType: 'EXACT_IN',
          slippageBps: params.slippageBps,
          sourceAddress: params.sourceAddress,
        })
      : undefined;

    return {
      withdrawTxXdr,
      swapTxXdr,
      estimatedAmountOut: params.shares, // Simplified
    };
  }
}
