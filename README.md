# Stellar DeFi SDK

A TypeScript SDK for building DeFi applications on Stellar/Soroban, integrating:

- **Crossmint Smart Accounts** - Multi-signature programmable wallets
- **Soroswap DEX** - Automated Market Maker for token swaps
- **Defindex Yield** - Yield optimization vaults

## Project Structure

```
├── packages/
│   └── stellar-defi-sdk/     # Core SDK library
│       ├── src/
│       │   ├── wallet/       # Crossmint wallet integration
│       │   ├── dex/          # Soroswap DEX integration
│       │   ├── yield/        # Defindex yield integration
│       │   └── config/       # Network and contract configuration
│       └── package.json
│
├── apps/
│   └── demo/                 # Next.js demo application
│       └── src/
│           ├── app/          # Next.js App Router pages
│           ├── components/   # React components
│           └── providers/    # Context providers
│
└── package.json              # Monorepo root
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Development

```bash
# Start development mode for all packages
pnpm dev

# Run the demo app
cd apps/demo && pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_CROSSMINT_API_KEY=your_api_key
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

## SDK Usage

```typescript
import { StellarDefiClient } from '@stellar-defi/sdk';

// Initialize the client
const client = new StellarDefiClient({
  network: 'testnet',
  crossmint: {
    apiKey: 'your-api-key',
  },
});

// Create a smart wallet
const wallet = await client.wallet.createWallet({
  signerType: 'ed25519',
});

// Get a swap quote
const quote = await client.dex.getQuote({
  tokenIn: 'XLM_ADDRESS',
  tokenOut: 'USDC_ADDRESS',
  amount: 1000000000n, // 100 XLM (7 decimals)
  tradeType: 'EXACT_IN',
});

// Deposit to a yield vault
const depositTx = await client.yield.buildDepositTransaction({
  vault: 'VAULT_ADDRESS',
  amounts: [1000000000n],
  sourceAddress: wallet.address,
  invest: true,
});
```

## Testing

The SDK uses TDD (Test-Driven Development) with Vitest:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
cd packages/stellar-defi-sdk && pnpm test:watch
```

## Networks

### Testnet (Default)
- Soroswap Router: `CB27QWLCQHBLJJS4L7TQAIZRQWQP7BKQW7LVDSJPVKLXHVDQEAI4QKIA`
- Soroswap Factory: `CDGHOS3LPRTQ3WWADCOC754JTSNGL6YU6NAXPEJKDXCMQ4FF2FRXNVAP`
- Defindex Factory: `CBUXUZODKPQZWCNQCFZ6Y5DKUHAXJ5C3MTKCBBGXU2E4TVPTQ7UDXQWM`

### Mainnet
- Soroswap Router: `CAG5LRYQ5JVEUI5TEID4QWPN5BEPBHFRGQAT7OZUWTTRKKQXHVLJ2BQC`
- Soroswap Factory: `CA4HEQTL46NAIYJNNI2HCNCGCGCGCJMJ4CNDCXQRPVN2LFZQJJ7RJ6D6`

## References

- [Crossmint Smart Account](https://github.com/Crossmint/stellar-smart-account)
- [Soroswap Core](https://github.com/soroswap/core)
- [Defindex](https://github.com/paltalabs/defindex)
- [Stellar Workshop DMB](https://github.com/chopan123/stellar-workshop-dmb)

## License

MIT
