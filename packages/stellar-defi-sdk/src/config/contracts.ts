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
    vault: string;
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
      factory: 'CDJTMBYKNUGINFQALHDMPLZYNGUV42GPN4B7QOYTWHRC4EE5IYJM6AES',
      router: 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS',
    },
    defindex: {
      factory: 'CBUXUZODKPQZWCNQCFZ6Y5DKUHAXJ5C3MTKCBBGXU2E4TVPTQ7UDXQWM',
      vault: 'CDONBLOOTYZ7QN62ZLJFHK7CT3JCP3JEZDCRSG3VLGAP73QAXS7HF6HU',
    },
    tokens: {
      XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      USDC: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    },
  },
  mainnet: {
    soroswap: {
      factory: 'CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2',
      router: 'CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH',
    },
    defindex: {
      factory: '',
      vault: 'CDONBLOOTYZ7QN62ZLJFHK7CT3JCP3JEZDCRSG3VLGAP73QAXS7HF6HU',
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
