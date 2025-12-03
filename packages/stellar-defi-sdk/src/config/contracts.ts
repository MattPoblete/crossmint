import type { Network } from './networks';

/**
 * Contract addresses configuration
 */
export interface ContractAddresses {
  soroswap: {
    factory: string;
    router: string;
  };
  defindex: {
    factory: string;
  };
  tokens: {
    XLM: string;
    USDC: string;
    [key: string]: string;
  };
}

/**
 * Contract addresses by network
 */
export const CONTRACTS: Record<Network, ContractAddresses> = {
  testnet: {
    soroswap: {
      factory: 'CDGHOS3LPRTQ3WWADCOC754JTSNGL6YU6NAXPEJKDXCMQ4FF2FRXNVAP',
      router: 'CB27QWLCQHBLJJS4L7TQAIZRQWQP7BKQW7LVDSJPVKLXHVDQEAI4QKIA',
    },
    defindex: {
      factory: 'CBUXUZODKPQZWCNQCFZ6Y5DKUHAXJ5C3MTKCBBGXU2E4TVPTQ7UDXQWM',
    },
    tokens: {
      XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      USDC: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    },
  },
  mainnet: {
    soroswap: {
      factory: 'CA4HEQTL46NAIYJNNI2HCNCGCGCGCJMJ4CNDCXQRPVN2LFZQJJ7RJ6D6',
      router: 'CAG5LRYQ5JVEUI5TEID4QWPN5BEPBHFRGQAT7OZUWTTRKKQXHVLJ2BQC',
    },
    defindex: {
      factory: '', // TODO: Add mainnet factory address
    },
    tokens: {
      XLM: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
      USDC: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
    },
  },
};

/**
 * Get contract addresses for a network
 */
export function getContracts(network: Network): ContractAddresses {
  return CONTRACTS[network];
}

/**
 * Get token address by symbol
 */
export function getTokenAddress(network: Network, symbol: string): string | undefined {
  return CONTRACTS[network].tokens[symbol];
}
