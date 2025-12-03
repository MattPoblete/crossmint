// Main client
export {
  StellarDefiClient,
  type StellarDefiConfig,
  type SwapAndDepositParams,
  type SwapAndDepositResult,
  type WithdrawAndSwapParams,
  type WithdrawAndSwapResult,
} from './client';

// Wallet module
export {
  CrossmintWallet,
  type CrossmintWalletConfig,
  type CreateWalletOptions,
  type IWallet,
  type PolicyInfo,
  type SignedTransaction,
  type SignerConfig,
  type SignerInfo,
  type SignerRole,
  type SignerType,
  type TxResult,
  type WalletBalance,
  type WalletInfo,
} from './wallet';

// DEX module
export {
  SoroswapDex,
  type AddLiquidityParams,
  type DexConfig,
  type IDex,
  type LiquidityResult,
  type Pool,
  type Quote,
  type QuoteParams,
  type RemoveLiquidityParams,
  type SwapParams,
  type SwapResult,
  type TokenInfo,
  type TradeType,
} from './dex';

// Yield module
export {
  DefindexYield,
  type DepositParams,
  type DepositResult,
  type IYield,
  type Strategy,
  type Vault,
  type VaultAsset,
  type VaultBalance,
  type VaultDetail,
  type WithdrawParams,
  type WithdrawResult,
  type YieldConfig,
} from './yield';

// Config
export { getNetworkConfig, isValidNetwork, type Network, type NetworkConfig } from './config/networks';
export { getContracts, getTokenAddress, type ContractAddresses } from './config/contracts';

// Errors
export {
  ConfigurationError,
  DexError,
  ErrorCodes,
  NetworkError,
  StellarDefiError,
  TransactionError,
  WalletError,
  YieldError,
  type ErrorCode,
} from './errors';
