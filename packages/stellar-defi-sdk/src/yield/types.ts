import type { Network } from '../config/networks';

/**
 * Yield configuration
 */
export interface YieldConfig {
  network: Network;
  rpcUrl?: string;
}

/**
 * Asset information in a vault
 */
export interface VaultAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  allocation: number; // Percentage allocation in the vault
}

/**
 * Strategy information
 */
export interface Strategy {
  address: string;
  name: string;
  type: 'blend' | 'hodl' | 'fixed_apr' | 'soroswap' | string;
  allocation: number; // Percentage allocation
  apy?: number;
}

/**
 * Vault information
 */
export interface Vault {
  address: string;
  name: string;
  symbol: string;
  assets: VaultAsset[];
  strategies: Strategy[];
  tvl: bigint;
  totalShares: bigint;
  apy: number;
  manager: string;
  emergencyManager: string;
  feeReceiver: string;
}

/**
 * Detailed vault information
 */
export interface VaultDetail extends Vault {
  description?: string;
  createdAt?: number;
  lastHarvest?: number;
  performanceFee: number;
  managementFee: number;
}

/**
 * User balance in a vault
 */
export interface VaultBalance {
  vault: string;
  shares: bigint;
  value: bigint;
  assets: {
    address: string;
    amount: bigint;
  }[];
}

/**
 * Deposit parameters
 */
export interface DepositParams {
  vault: string;
  amounts: bigint[];
  sourceAddress: string;
  slippageBps?: number;
  /**
   * Whether to invest in strategies after deposit
   */
  invest?: boolean;
}

/**
 * Deposit result
 */
export interface DepositResult {
  success: boolean;
  hash: string;
  sharesMinted: bigint;
  amountsDeposited: bigint[];
}

/**
 * Withdraw parameters
 */
export interface WithdrawParams {
  vault: string;
  shares: bigint;
  sourceAddress: string;
  slippageBps?: number;
  /**
   * Specific assets to withdraw (if vault supports multi-asset withdrawal)
   */
  withdrawAssets?: string[];
}

/**
 * Withdraw result
 */
export interface WithdrawResult {
  success: boolean;
  hash: string;
  sharesBurned: bigint;
  amountsWithdrawn: bigint[];
}

/**
 * Interface for yield operations
 */
export interface IYield {
  /**
   * Get all available vaults
   */
  getVaults(): Promise<Vault[]>;

  /**
   * Get vault by address
   */
  getVault(address: string): Promise<VaultDetail>;

  /**
   * Get user balance in a vault
   */
  getVaultBalance(vault: string, user: string): Promise<VaultBalance>;

  /**
   * Get estimated APY for a vault
   */
  getEstimatedAPY(vault: string): Promise<number>;

  /**
   * Build deposit transaction XDR
   */
  buildDepositTransaction(params: DepositParams): Promise<string>;

  /**
   * Build withdraw transaction XDR
   */
  buildWithdrawTransaction(params: WithdrawParams): Promise<string>;
}
