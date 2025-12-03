'use client';

import { useState } from 'react';
import type { Quote } from '@stellar-defi/sdk';

import { useWallet } from '@/providers/WalletProvider';
import { getClient } from '@/lib/sdk';

const TOKENS = [
  { symbol: 'XLM', address: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA' },
  { symbol: 'USDC', address: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75' },
];

export function SwapWidget() {
  const { address } = useWallet();
  const [tokenInIndex, setTokenInIndex] = useState(0);
  const [tokenOutIndex, setTokenOutIndex] = useState(1);
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenIn = TOKENS[tokenInIndex];
  const tokenOut = TOKENS[tokenOutIndex];

  const handleGetQuote = async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getClient();
      const amount = BigInt(Math.floor(parseFloat(amountIn) * 10_000_000)); // 7 decimals

      const quoteResult = await client.dex.getQuote({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amount,
        tradeType: 'EXACT_IN',
      });

      setQuote(quoteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getClient();
      const txXdr = await client.dex.buildSwapTransaction({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amount: quote.amountIn,
        tradeType: 'EXACT_IN',
        slippageBps: 100, // 1%
        sourceAddress: address,
      });

      // In a real implementation, we would sign and submit the transaction
      console.log('Swap transaction built:', txXdr);
      alert('Swap transaction built! Check console for XDR.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build swap transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const switchTokens = () => {
    setTokenInIndex(tokenOutIndex);
    setTokenOutIndex(tokenInIndex);
    setQuote(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-6">Swap</h2>

      {/* Token In */}
      <div className="mb-4">
        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">From</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amountIn}
            onChange={(e) => {
              setAmountIn(e.target.value);
              setQuote(null);
            }}
            placeholder="0.0"
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-stellar-500"
          />
          <select
            value={tokenInIndex}
            onChange={(e) => {
              setTokenInIndex(Number(e.target.value));
              setQuote(null);
            }}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            {TOKENS.map((token, index) => (
              <option key={token.symbol} value={index}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center my-2">
        <button
          onClick={switchTokens}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          ↕
        </button>
      </div>

      {/* Token Out */}
      <div className="mb-6">
        <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">To</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={quote ? (Number(quote.amountOut) / 10_000_000).toFixed(7) : ''}
            readOnly
            placeholder="0.0"
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          />
          <select
            value={tokenOutIndex}
            onChange={(e) => {
              setTokenOutIndex(Number(e.target.value));
              setQuote(null);
            }}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            {TOKENS.map((token, index) => (
              <option key={token.symbol} value={index}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quote Info */}
      {quote && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Price Impact</span>
            <span>{quote.priceImpact.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">Route</span>
            <span>{quote.route.length} hops</span>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Buttons */}
      <div className="space-y-2">
        {!quote ? (
          <button
            onClick={handleGetQuote}
            disabled={isLoading || !amountIn}
            className="w-full px-4 py-3 bg-stellar-600 hover:bg-stellar-700 disabled:bg-stellar-400 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Getting Quote...' : 'Get Quote'}
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Building Transaction...' : 'Swap'}
          </button>
        )}
      </div>
    </div>
  );
}
