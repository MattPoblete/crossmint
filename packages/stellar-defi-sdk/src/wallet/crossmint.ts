import {
  CrossmintWallets,
  StellarWallet,
  createCrossmint,
  type Wallet,
  type StellarChain,
} from '@crossmint/wallets-sdk';

import { ConfigurationError, ErrorCodes, WalletError } from '../errors';
import { getNetworkConfig, type Network } from '../config/networks';
import { mapSdkWalletToWalletInfo, mapSdkBalancesToWalletBalances } from './sdk-mapper';

import type {
  CrossmintWalletConfig,
  CreateWalletOptions,
  IWallet,
  SignedTransaction,
  SignerConfig,
  TxResult,
  WalletBalance,
  WalletInfo,
} from './types';

/**
 * Crossmint Smart Wallet implementation for Stellar/Soroban
 *
 * Uses @crossmint/wallets-sdk for wallet operations when possible,
 * with fallback to REST API for operations not yet supported by SDK.
 */
export class CrossmintWallet implements IWallet {
  private readonly apiKey: string;
  private readonly network: Network;
  private readonly rpcUrl: string;
  private readonly baseUrl: string;

  // SDK instances
  private crossmintWallets: CrossmintWallets | null = null;
  private stellarWallet: StellarWallet | null = null;

  constructor(config: CrossmintWalletConfig) {
    if (!config.apiKey) {
      throw new ConfigurationError('API key is required', ErrorCodes.MISSING_API_KEY);
    }

    this.apiKey = config.apiKey;
    this.network = config.network;

    const networkConfig = getNetworkConfig(config.network, config.rpcUrl);
    this.rpcUrl = networkConfig.rpcUrl;

    // Crossmint API base URL (used for fallback REST calls)
    // Can be overridden for proxy usage (e.g., to avoid CORS in browser)
    // Note: baseUrl should NOT include API version - methods will add the correct version
    this.baseUrl =
      config.baseUrl ??
      (config.network === 'mainnet'
        ? 'https://www.crossmint.com/api'
        : 'https://staging.crossmint.com/api');

    // Initialize SDK
    this.initializeSdk();
  }

  /**
   * Initialize the Crossmint SDK
   */
  private initializeSdk(): void {
    try {
      const crossmint = createCrossmint({
        apiKey: this.apiKey,
      });
      this.crossmintWallets = CrossmintWallets.from(crossmint);
    } catch (error) {
      // SDK initialization may fail if API key format is invalid
      // We'll fallback to REST API in that case
      console.warn('Failed to initialize Crossmint SDK, will use REST API fallback:', error);
    }
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
   * Create a new smart wallet
   *
   * Note: SDK wallet creation requires user authentication (JWT).
   * For server-side wallet creation, we use the REST API directly.
   */
  async createWallet(options: CreateWalletOptions): Promise<WalletInfo> {
    // Use REST API for server-side wallet creation
    // The SDK requires user authentication which isn't available server-side
    // Using legacy API endpoint: 2022-06-09/wallets
    try {
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const response = await fetch(`${this.baseUrl}/2022-06-09/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          type: 'custodial', // or 'smart-wallet' depending on use case
          chain,
          linkedUser: `email:test-${Date.now()}@example.com`, // Required for wallet creation
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new WalletError(
          error.error ?? 'Failed to create wallet',
          ErrorCodes.WALLET_CREATION_FAILED
        );
      }

      const data = (await response.json()) as WalletInfo;
      return {
        ...data,
        network: this.network,
      };
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Failed to create wallet',
        ErrorCodes.WALLET_CREATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get wallet information by address
   */
  async getWallet(address: string): Promise<WalletInfo> {
    try {
      // v1-alpha2 endpoint for wallet details
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const walletLocator = `${chain}:${address}`;
      const response = await fetch(`${this.baseUrl}/v1-alpha2/wallets/${walletLocator}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new WalletError('Wallet not found', ErrorCodes.WALLET_NOT_FOUND);
        }
        const error = (await response.json()) as { error?: string };
        throw new WalletError(error.error ?? 'Failed to get wallet', ErrorCodes.WALLET_NOT_FOUND);
      }

      const data = (await response.json()) as WalletInfo;
      return {
        ...data,
        network: this.network,
      };
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Wallet not found',
        ErrorCodes.WALLET_NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Add a new signer to the wallet
   */
  async addSigner(address: string, signer: SignerConfig): Promise<TxResult> {
    try {
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const walletLocator = `${chain}:${address}`;
      const response = await fetch(`${this.baseUrl}/v1-alpha2/wallets/${walletLocator}/signers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify(signer),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new WalletError(
          error.error ?? 'Failed to add signer',
          ErrorCodes.INVALID_SIGNER,
          undefined
        );
      }

      return (await response.json()) as TxResult;
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Failed to add signer',
        ErrorCodes.INVALID_SIGNER,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Remove a signer from the wallet
   */
  async removeSigner(address: string, signerPublicKey: string): Promise<TxResult> {
    try {
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const walletLocator = `${chain}:${address}`;
      const response = await fetch(
        `${this.baseUrl}/v1-alpha2/wallets/${walletLocator}/signers/${signerPublicKey}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-KEY': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new WalletError(error.error ?? 'Failed to remove signer', ErrorCodes.SIGNER_NOT_FOUND);
      }

      return (await response.json()) as TxResult;
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Failed to remove signer',
        ErrorCodes.SIGNER_NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sign a transaction XDR
   */
  async signTransaction(txXdr: string, signerPublicKey?: string): Promise<SignedTransaction> {
    try {
      // Note: This endpoint may need adjustment based on Crossmint's actual API
      // The SDK uses transactions endpoint for signing
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const response = await fetch(`${this.baseUrl}/v1-alpha2/wallets/${chain}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          transaction: txXdr,
          signerPublicKey,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new WalletError(
          error.error ?? 'Failed to sign transaction',
          ErrorCodes.SIGNATURE_FAILED
        );
      }

      return (await response.json()) as SignedTransaction;
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Failed to sign transaction',
        ErrorCodes.SIGNATURE_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute a transaction (sign and submit)
   */
  async executeTransaction(txXdr: string): Promise<TxResult> {
    // First sign the transaction
    const signedTx = await this.signTransaction(txXdr);

    // Then submit to network
    // Note: Crossmint SDK typically handles sign+submit in one call
    // This is a fallback implementation
    try {
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const response = await fetch(`${this.baseUrl}/v1-alpha2/wallets/${chain}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          transaction: signedTx.signedXdr,
          submit: true,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new WalletError(
          error.error ?? 'Failed to submit transaction',
          ErrorCodes.TX_SUBMISSION_FAILED
        );
      }

      return (await response.json()) as TxResult;
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Failed to execute transaction',
        ErrorCodes.TX_SUBMISSION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get wallet balances
   */
  async getBalances(address: string): Promise<WalletBalance[]> {
    try {
      const chain = this.network === 'mainnet' ? 'stellar' : 'stellar-testnet';
      const walletLocator = `${chain}:${address}`;
      // Note: The SDK uses POST for balances, not GET
      const response = await fetch(`${this.baseUrl}/v1-alpha2/wallets/${walletLocator}/balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new WalletError(error.error ?? 'Failed to get balances', ErrorCodes.WALLET_NOT_FOUND);
      }

      return (await response.json()) as WalletBalance[];
    } catch (error) {
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(
        'Failed to get balances',
        ErrorCodes.WALLET_NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ============================================
  // SDK-based methods (for client-side usage)
  // ============================================

  /**
   * Get the underlying CrossmintWallets SDK instance
   * Useful for advanced SDK features not exposed through IWallet
   */
  getSdkInstance(): CrossmintWallets | null {
    return this.crossmintWallets;
  }

  /**
   * Set a StellarWallet instance from SDK
   * Use this when you have an authenticated wallet from the SDK
   */
  setStellarWallet(wallet: StellarWallet): void {
    this.stellarWallet = wallet;
  }

  /**
   * Get the current StellarWallet instance
   */
  getStellarWallet(): StellarWallet | null {
    return this.stellarWallet;
  }

  /**
   * Send a transaction using SDK (requires authenticated wallet)
   * This is an alternative to signTransaction + submit for SDK users
   */
  async sendTransactionViaSdk(params: {
    contractId: string;
    method?: string;
    args?: Record<string, unknown>;
    transaction?: string;
  }): Promise<{ hash: string; explorerLink?: string }> {
    if (!this.stellarWallet) {
      throw new WalletError(
        'No StellarWallet set. Use setStellarWallet() first or use signTransaction() for server-side.',
        ErrorCodes.WALLET_NOT_FOUND
      );
    }

    try {
      const result = await this.stellarWallet.sendTransaction({
        contractId: params.contractId,
        method: params.method,
        args: params.args,
        transaction: params.transaction,
      } as Parameters<StellarWallet['sendTransaction']>[0]);

      return {
        hash: result.hash ?? '',
        explorerLink: result.explorerLink,
      };
    } catch (error) {
      throw new WalletError(
        'Failed to send transaction via SDK',
        ErrorCodes.TX_SUBMISSION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }
}
