import {
  SoroswapSDK,
  TradeType as SoroswapTradeType,
  SupportedNetworks,
  SupportedProtocols,
} from '@soroswap/sdk';
import {
  Contract,
  rpc,
  TransactionBuilder,
  xdr,
  Address,
  nativeToScVal,
  Account,
} from '@stellar/stellar-sdk';

import { DexError, ErrorCodes } from '../errors';
import { getContracts } from '../config/contracts';
import { getNetworkConfig, NETWORK_PASSPHRASES, type Network } from '../config/networks';

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

      // Only EXACT_IN is supported for now
      if (params.tradeType !== 'EXACT_IN') {
        throw new DexError(
          'Only EXACT_IN trade type is currently supported',
          ErrorCodes.SWAP_FAILED
        );
      }

      // Get quote to determine the route and expected output
      const quote = await this.getQuote({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amount: params.amount,
        tradeType: params.tradeType,
      });

      // Calculate minimum amount out with slippage tolerance
      const slippageBps = params.slippageBps ?? 100; // Default 1%
      const minAmountOut = this.applySlippage(quote.amountOut, slippageBps);

      // Calculate deadline (default 30 minutes from now)
      const deadline = params.deadline ?? Math.floor(Date.now() / 1000) + 1800;

      // Build the Soroban contract invocation
      const server = new rpc.Server(this.rpcUrl);
      const contract = new Contract(this.routerAddress);

      // Build contract call operation
      // swap_exact_tokens_for_tokens(amount_in, amount_out_min, path, to, deadline)
      const operation = contract.call(
        'swap_exact_tokens_for_tokens',
        this.bigintToI128(params.amount), // amount_in: i128
        this.bigintToI128(minAmountOut), // amount_out_min: i128
        this.buildPathVector(quote.route), // path: Vec<Address>
        new Address(params.sourceAddress).toScVal(), // to: Address
        this.timestampToU64(deadline) // deadline: u64
      );

      // Get the source account for transaction building
      const sourceAccount = await this.getSourceAccount(server, 'GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO');

      // Get network passphrase
      const networkPassphrase = NETWORK_PASSPHRASES[this.network];

      // Build the transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100', // Base fee - will be adjusted by simulation
        networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate the transaction to get resource estimates and footprint
      const simulation = await server.simulateTransaction(transaction);

      // Check for simulation errors
      if (rpc.Api.isSimulationError(simulation)) {
        throw new DexError(
          `Transaction simulation failed: ${simulation.error}`,
          ErrorCodes.SWAP_FAILED
        );
      }

      // Assemble the transaction with simulation results
      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      // Return the XDR of the unsigned transaction as base64 string
      // Use String() to ensure primitive string (not String object)
      const xdrString = String(preparedTransaction.toXDR());

      return xdrString;
    } catch (error) {
      if (error instanceof DexError) {
        throw error;
      }
      throw new DexError(
        `Failed to build swap transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  /**
   * Convert a bigint to an i128 ScVal for Soroban contract calls
   */
  private bigintToI128(value: bigint): xdr.ScVal {
    return nativeToScVal(value, { type: 'i128' });
  }

  /**
   * Convert an array of token addresses to a Vec<Address> ScVal
   */
  private buildPathVector(path: string[]): xdr.ScVal {
    const addresses = path.map((addr) => new Address(addr).toScVal());
    return xdr.ScVal.scvVec(addresses);
  }

  /**
   * Convert a Unix timestamp to a u64 ScVal
   */
  private timestampToU64(timestamp: number): xdr.ScVal {
    return nativeToScVal(timestamp, { type: 'u64' });
  }

  /**
   * Get or create a source account for transaction building
   */
  private async getSourceAccount(server: rpc.Server, address: string): Promise<Account> {
    try {
      const account = await server.getAccount(address);
      return account;
    } catch {
      // If account doesn't exist (e.g., new smart wallet), create placeholder
      return new Account(address, '0');
    }
  }
}
