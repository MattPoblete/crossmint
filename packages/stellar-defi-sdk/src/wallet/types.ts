import type { Network } from '../config/networks';

/**
 * Signer types supported by Crossmint Smart Account
 */
export type SignerType = 'ed25519' | 'secp256r1';

/**
 * Signer role in the smart account
 */
export type SignerRole = 'admin' | 'standard';

/**
 * Signer information
 */
export interface SignerInfo {
  type: SignerType;
  publicKey: string;
  role: SignerRole;
}

/**
 * Policy information for smart account
 */
export interface PolicyInfo {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

/**
 * Wallet information
 */
export interface WalletInfo {
  address: string;
  publicKey: string;
  signers: SignerInfo[];
  policies: PolicyInfo[];
  network: Network;
}

/**
 * Signer configuration for adding new signers
 */
export interface SignerConfig {
  type: SignerType;
  publicKey: string;
  role: SignerRole;
  name?: string;
}

/**
 * Configuration for Crossmint wallet
 */
export interface CrossmintWalletConfig {
  apiKey: string;
  network: Network;
  rpcUrl?: string;
  /**
   * Custom base URL for Crossmint API (useful for proxying requests)
   * Should NOT include API version - methods will add the correct version
   * Defaults to https://www.crossmint.com/api (mainnet)
   * or https://staging.crossmint.com/api (testnet)
   */
  baseUrl?: string;
}

/**
 * Transaction result
 */
export interface TxResult {
  success: boolean;
  hash: string;
  ledger?: number;
  resultXdr?: string;
}

/**
 * Signed transaction
 */
export interface SignedTransaction {
  signedXdr: string;
  publicKey: string;
}

/**
 * Wallet balance
 */
export interface WalletBalance {
  asset: string;
  balance: string;
  decimals: number;
}

/**
 * Create wallet options
 */
export interface CreateWalletOptions {
  signerType: SignerType;
  /**
   * Optional initial policies
   */
  policies?: PolicyInfo[];
}

/**
 * Interface for wallet operations
 */
export interface IWallet {
  /**
   * Create a new smart wallet
   */
  createWallet(options: CreateWalletOptions): Promise<WalletInfo>;

  /**
   * Get wallet information by address
   */
  getWallet(address: string): Promise<WalletInfo>;

  /**
   * Add a new signer to the wallet
   */
  addSigner(address: string, signer: SignerConfig): Promise<TxResult>;

  /**
   * Remove a signer from the wallet
   */
  removeSigner(address: string, signerPublicKey: string): Promise<TxResult>;

  /**
   * Sign a transaction XDR
   */
  signTransaction(txXdr: string, signerPublicKey?: string): Promise<SignedTransaction>;

  /**
   * Execute a transaction (sign and submit)
   */
  executeTransaction(txXdr: string): Promise<TxResult>;

  /**
   * Get wallet balances
   */
  getBalances(address: string): Promise<WalletBalance[]>;
}
