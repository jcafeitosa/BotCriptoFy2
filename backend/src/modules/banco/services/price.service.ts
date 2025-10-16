/**
 * Price Service
 *
 * Integrates with CoinGecko API to fetch real-time cryptocurrency prices
 */

import { db } from '@/db';
import { assetPriceHistory } from '../schema/wallet.schema';
import type { AssetType, CoinGeckoPriceResponse, PriceData } from '../types/wallet.types';
import logger from '@/utils/logger';

/**
 * Asset to CoinGecko ID mapping
 */
const ASSET_TO_COINGECKO_ID: Record<AssetType, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  BRL: 'brazilian-real',
  USD: 'usd',
};

/**
 * CoinGecko ID to Asset mapping
 */
const COINGECKO_ID_TO_ASSET: Record<string, AssetType> = Object.entries(
  ASSET_TO_COINGECKO_ID
).reduce(
  (acc, [asset, id]) => {
    acc[id] = asset as AssetType;
    return acc;
  },
  {} as Record<string, AssetType>
);

/**
 * Price Service
 */
export class PriceService {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private priceCache = new Map<AssetType, { price: PriceData; timestamp: number }>();
  private readonly cacheTimeout = 60000; // 1 minute

  /**
   * Get current price for a single asset
   */
  async getPrice(asset: AssetType): Promise<PriceData | null> {
    try {
      // Check cache first
      const cached = this.priceCache.get(asset);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.price;
      }

      // Special cases for fiat
      if (asset === 'USD') {
        const usdPrice: PriceData = {
          asset: 'USD',
          priceUsd: '1.00',
          priceBtc: '0',
          priceBrl: '5.00', // Approximate, should be updated from forex API
          lastUpdate: new Date(),
        };
        this.priceCache.set(asset, { price: usdPrice, timestamp: Date.now() });
        return usdPrice;
      }

      if (asset === 'BRL') {
        const brlPrice: PriceData = {
          asset: 'BRL',
          priceUsd: '0.20', // Approximate, should be updated from forex API
          priceBtc: '0',
          lastUpdate: new Date(),
        };
        this.priceCache.set(asset, { price: brlPrice, timestamp: Date.now() });
        return brlPrice;
      }

      // Fetch from CoinGecko
      const coinId = ASSET_TO_COINGECKO_ID[asset];
      if (!coinId) {
        logger.warn(`No CoinGecko ID mapping for asset: ${asset}`);
        return null;
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd,btc,brl&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();
      const coinData = data[coinId];

      if (!coinData) {
        logger.warn(`No price data returned for ${asset} (${coinId})`);
        return null;
      }

      const priceData: PriceData = {
        asset,
        priceUsd: coinData.usd.toString(),
        priceBtc: coinData.btc?.toString(),
        priceBrl: coinData.brl?.toString(),
        marketCap: coinData.usd_market_cap?.toString(),
        volume24h: coinData.usd_24h_vol?.toString(),
        change24h: coinData.usd_24h_change?.toString(),
        lastUpdate: new Date(),
      };

      // Update cache
      this.priceCache.set(asset, { price: priceData, timestamp: Date.now() });

      // Save to price history
      await this.savePriceHistory(priceData);

      return priceData;
    } catch (error) {
      logger.error(`Error fetching price for ${asset}:`, { error });
      return null;
    }
  }

  /**
   * Get prices for multiple assets
   */
  async getPrices(assets: AssetType[]): Promise<Map<AssetType, PriceData>> {
    const prices = new Map<AssetType, PriceData>();

    try {
      // Separate assets into cached and non-cached
      const uncachedAssets: AssetType[] = [];
      const now = Date.now();

      for (const asset of assets) {
        const cached = this.priceCache.get(asset);
        if (cached && now - cached.timestamp < this.cacheTimeout) {
          prices.set(asset, cached.price);
        } else {
          uncachedAssets.push(asset);
        }
      }

      if (uncachedAssets.length === 0) {
        return prices;
      }

      // Filter fiat currencies
      const cryptoAssets = uncachedAssets.filter((a) => a !== 'USD' && a !== 'BRL');
      const fiatAssets = uncachedAssets.filter((a) => a === 'USD' || a === 'BRL');

      // Handle fiat
      for (const asset of fiatAssets) {
        const price = await this.getPrice(asset);
        if (price) {
          prices.set(asset, price);
        }
      }

      if (cryptoAssets.length === 0) {
        return prices;
      }

      // Batch fetch crypto prices
      const coinIds = cryptoAssets.map((a) => ASSET_TO_COINGECKO_ID[a]).filter(Boolean);

      if (coinIds.length === 0) {
        return prices;
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd,btc,brl&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();

      // Process each coin
      for (const [coinId, coinData] of Object.entries(data)) {
        const asset = COINGECKO_ID_TO_ASSET[coinId];
        if (!asset) continue;

        const priceData: PriceData = {
          asset,
          priceUsd: coinData.usd.toString(),
          priceBtc: coinData.btc?.toString(),
          priceBrl: coinData.brl?.toString(),
          marketCap: coinData.usd_market_cap?.toString(),
          volume24h: coinData.usd_24h_vol?.toString(),
          change24h: coinData.usd_24h_change?.toString(),
          lastUpdate: new Date(),
        };

        prices.set(asset, priceData);
        this.priceCache.set(asset, { price: priceData, timestamp: Date.now() });

        // Save to history
        await this.savePriceHistory(priceData);
      }

      return prices;
    } catch (error) {
      logger.error('Error fetching multiple prices:', { error, assets });
      return prices;
    }
  }

  /**
   * Get BTC price in USD
   */
  async getBtcPrice(): Promise<number> {
    const price = await this.getPrice('BTC');
    return price ? parseFloat(price.priceUsd) : 0;
  }

  /**
   * Convert amount from one asset to another
   */
  async convert(
    amount: number,
    fromAsset: AssetType,
    toAsset: AssetType
  ): Promise<number | null> {
    try {
      if (fromAsset === toAsset) return amount;

      const fromPrice = await this.getPrice(fromAsset);
      const toPrice = await this.getPrice(toAsset);

      if (!fromPrice || !toPrice) return null;

      const amountInUsd = amount * parseFloat(fromPrice.priceUsd);
      const convertedAmount = amountInUsd / parseFloat(toPrice.priceUsd);

      return convertedAmount;
    } catch (error) {
      logger.error('Error converting assets:', { error, fromAsset, toAsset, amount });
      return null;
    }
  }

  /**
   * Calculate USD value of asset amount
   */
  async calculateUsdValue(asset: AssetType, amount: number): Promise<number> {
    try {
      const price = await this.getPrice(asset);
      if (!price) return 0;

      return amount * parseFloat(price.priceUsd);
    } catch (error) {
      logger.error('Error calculating USD value:', { error, asset, amount });
      return 0;
    }
  }

  /**
   * Calculate BTC value of asset amount
   */
  async calculateBtcValue(asset: AssetType, amount: number): Promise<number> {
    try {
      if (asset === 'BTC') return amount;

      const price = await this.getPrice(asset);
      if (!price || !price.priceBtc) return 0;

      return amount * parseFloat(price.priceBtc);
    } catch (error) {
      logger.error('Error calculating BTC value:', { error, asset, amount });
      return 0;
    }
  }

  /**
   * Save price to history
   */
  private async savePriceHistory(priceData: PriceData): Promise<void> {
    try {
      await db.insert(assetPriceHistory).values({
        asset: priceData.asset,
        priceUsd: priceData.priceUsd,
        priceBtc: priceData.priceBtc || '0',
        marketCap: priceData.marketCap,
        volume24h: priceData.volume24h,
        change24h: priceData.change24h,
        source: 'coingecko',
        timestamp: priceData.lastUpdate,
      });
    } catch (error) {
      // Ignore duplicate errors (unique constraint)
      if (error instanceof Error && !error.message.includes('duplicate')) {
        logger.error('Error saving price history:', { error, asset: priceData.asset });
      }
    }
  }

  /**
   * Clear price cache
   */
  clearCache(asset?: AssetType): void {
    if (asset) {
      this.priceCache.delete(asset);
    } else {
      this.priceCache.clear();
    }
  }

  /**
   * Get cached price (without API call)
   */
  getCachedPrice(asset: AssetType): PriceData | null {
    const cached = this.priceCache.get(asset);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.priceCache.delete(asset);
      return null;
    }

    return cached.price;
  }
}

// Export singleton instance
export const priceService = new PriceService();
