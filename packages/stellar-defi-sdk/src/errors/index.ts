/**
 * Base error class for all SDK errors
 */
export class StellarDefiError extends Error {
  public readonly code: string;
  public readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'StellarDefiError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when wallet operations fail
 */
export class WalletError extends StellarDefiError {
  constructor(message: string, code: string = 'WALLET_ERROR', cause?: Error) {
    super(message, code, cause);
    this.name = 'WalletError';
  }
}

/**
 * Error thrown when DEX operations fail
 */
export class DexError extends StellarDefiError {
  constructor(message: string, code: string = 'DEX_ERROR', cause?: Error) {
    super(message, code, cause);
    this.name = 'DexError';
  }
}

/**
 * Error thrown when yield operations fail
 */
export class YieldError extends StellarDefiError {
  constructor(message: string, code: string = 'YIELD_ERROR', cause?: Error) {
    super(message, code, cause);
    this.name = 'YieldError';
  }
}

/**
 * Error thrown when network/connection issues occur
 */
export class NetworkError extends StellarDefiError {
  constructor(message: string, code: string = 'NETWORK_ERROR', cause?: Error) {
    super(message, code, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when transaction fails
 */
export class TransactionError extends StellarDefiError {
  public readonly txHash?: string;

  constructor(message: string, code: string = 'TRANSACTION_ERROR', txHash?: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'TransactionError';
    this.txHash = txHash;
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends StellarDefiError {
  constructor(message: string, code: string = 'CONFIG_ERROR', cause?: Error) {
    super(message, code, cause);
    this.name = 'ConfigurationError';
  }
}

// Error codes
export const ErrorCodes = {
  // Wallet errors
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_CREATION_FAILED: 'WALLET_CREATION_FAILED',
  SIGNER_NOT_FOUND: 'SIGNER_NOT_FOUND',
  INVALID_SIGNER: 'INVALID_SIGNER',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',

  // DEX errors
  INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
  SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
  SWAP_FAILED: 'SWAP_FAILED',
  POOL_NOT_FOUND: 'POOL_NOT_FOUND',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Yield errors
  VAULT_NOT_FOUND: 'VAULT_NOT_FOUND',
  DEPOSIT_FAILED: 'DEPOSIT_FAILED',
  WITHDRAW_FAILED: 'WITHDRAW_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',

  // Transaction errors
  TX_SUBMISSION_FAILED: 'TX_SUBMISSION_FAILED',
  TX_TIMEOUT: 'TX_TIMEOUT',
  TX_REJECTED: 'TX_REJECTED',

  // Network errors
  RPC_ERROR: 'RPC_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',

  // Config errors
  INVALID_NETWORK: 'INVALID_NETWORK',
  MISSING_API_KEY: 'MISSING_API_KEY',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
