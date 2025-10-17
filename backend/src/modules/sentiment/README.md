# Sentiment Analysis Module

Real-time cryptocurrency sentiment analysis from news and social media sources.

## 📊 Overview

This module provides comprehensive sentiment analysis capabilities for cryptocurrency markets, combining:
- **Multi-source data aggregation** (news, Twitter, Reddit)
- **Hybrid AI + Local NLP** for accurate sentiment scoring
- **Real-time streaming** via WebSocket
- **Price correlation analysis** and trading signal generation
- **Trending topics detection** with velocity-based ranking

## 🎯 Features

### Data Sources
- **News**: CryptoPanic API, RSS feeds (10+ crypto news sites)
- **Social Media**: Twitter filtered streaming, Reddit polling
- **Coverage**: 20+ cryptocurrencies with automatic symbol extraction

### Sentiment Analysis
- **Hybrid Approach**: Local NLP (fast) + Claude AI (accurate)
- **Crypto-Specific**: Custom lexicon with 80+ crypto terms
- **Aspects**: Fear, greed, uncertainty, hype detection
- **Confidence Scoring**: Statistical confidence levels

### Advanced Analytics
- **Aggregation**: Multi-source weighted averaging
- **Trending**: Real-time topic detection with velocity scoring
- **Correlation**: Pearson correlation between sentiment and price
- **Signals**: Automated trading signal generation
- **Fear & Greed Index**: Custom calculation based on multiple factors

## 🏗️ Architecture

```
sentiment/
├── types/                    # TypeScript interfaces
│   ├── news.types.ts        # News article types
│   ├── sentiment.types.ts   # Sentiment analysis types
│   └── social.types.ts      # Social media types
│
├── schema/                   # Database schemas
│   └── sentiment.schema.ts  # Drizzle ORM schemas (8 tables)
│
├── services/
│   ├── sources/             # Data source integrations
│   │   ├── cryptopanic.service.ts
│   │   ├── rss-feeds.service.ts
│   │   ├── twitter.service.ts
│   │   └── reddit.service.ts
│   │
│   ├── analysis/            # Sentiment analysis
│   │   ├── sentiment-local.service.ts   # Fast offline NLP
│   │   ├── sentiment-ai.service.ts      # Claude AI analysis
│   │   └── sentiment-hybrid.service.ts  # Intelligent routing
│   │
│   ├── aggregator/          # Data aggregation
│   │   └── sentiment-aggregator.service.ts
│   │
│   ├── analyzer/            # Advanced analysis
│   │   ├── trending-topics.service.ts
│   │   └── price-correlation.service.ts
│   │
│   └── streaming/           # Real-time updates
│       └── websocket-streaming.service.ts
│
└── routes/                  # API endpoints
    └── sentiment.routes.ts  # REST + WebSocket routes
```

## 📡 API Endpoints

### REST API

#### Health Check
```bash
GET /sentiment/health
```

#### Get Sentiment
```bash
GET /sentiment/:symbol?timeWindow=86400000
# Example: GET /sentiment/BTC
```

#### Get Trending Topics
```bash
GET /sentiment/trending?limit=50&symbol=BTC
```

#### Get News Articles
```bash
GET /sentiment/news?symbol=BTC&source=cryptopanic&limit=50
```

#### Get Social Mentions
```bash
GET /sentiment/social/:platform?symbol=BTC&limit=100
# Platforms: twitter, reddit
```

#### Analyze Custom Text
```bash
POST /sentiment/analyze
Content-Type: application/json

{
  "text": "Bitcoin is mooning! 🚀",
  "options": {
    "forceAI": false,
    "context": {
      "symbol": "BTC",
      "author": "user123"
    }
  }
}
```

#### Batch Analysis
```bash
POST /sentiment/analyze/batch
Content-Type: application/json

{
  "texts": [
    { "id": "1", "text": "BTC to the moon!" },
    { "id": "2", "text": "ETH looks bearish" }
  ]
}
```

#### Get Correlation
```bash
GET /sentiment/correlation/:symbol?timeframe=24h
```

#### Get Trading Signals
```bash
GET /sentiment/signals/:symbol
```

#### Get Statistics
```bash
GET /sentiment/stats
```

### WebSocket Streaming

Connect to real-time sentiment updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/sentiment/stream');

// Subscribe to channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'sentiment:BTC'
}));

// Available channels:
// - sentiment              (all symbols)
// - sentiment:BTC          (specific symbol)
// - trending               (trending topics)
// - news                   (all news)
// - news:BTC               (symbol news)
// - social                 (all social)
// - social:BTC             (symbol social)
// - signals                (all signals)
// - signals:BTC            (symbol signals)
// - alerts                 (user alerts)

// Receive updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};
```

## 🔧 Configuration

Environment variables:

```bash
# Sentiment Analysis
SENTIMENT_CONFIDENCE_THRESHOLD=0.7
SENTIMENT_CACHE_ENABLED=true
SENTIMENT_CACHE_TTL=3600000
SENTIMENT_CACHE_MAX_SIZE=1000
SENTIMENT_AI_MIN_TEXT_LENGTH=500
SENTIMENT_AI_FOR_INFLUENCERS=true
SENTIMENT_AI_FOR_IMPORTANT=true

# Aggregation
SENTIMENT_TIME_WINDOW=86400000
SENTIMENT_MIN_DATA_POINTS=5
SENTIMENT_RECENCY_DECAY=0.5
SENTIMENT_ENGAGEMENT_WEIGHT=0.3
SENTIMENT_INFLUENCER_BOOST=1.5

# Trending
TRENDING_TIME_WINDOW=3600000
TRENDING_MIN_MENTIONS=10
TRENDING_VELOCITY_THRESHOLD=5
TRENDING_ENGAGEMENT_WEIGHT=0.4
TRENDING_RECENCY_DECAY=0.7
TRENDING_MAX_TOPICS=50

# Correlation
CORRELATION_MIN_DATA_POINTS=20
CORRELATION_TIMEFRAMES=[1,4,24,168]
CORRELATION_MAX_LAG=24
CORRELATION_SIGNIFICANCE=0.05
CORRELATION_DIVERGENCE_THRESHOLD=0.3

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_CLIENT_TIMEOUT=60000
WS_MAX_SUBSCRIPTIONS=50
WS_MESSAGE_RATE_LIMIT=100
WS_BATCH_DELAY=1000
WS_MAX_BATCH_SIZE=10

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307
CRYPTOPANIC_API_KEY=...
TWITTER_BEARER_TOKEN=...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...
```

## 📊 Database Schema

8 tables with TimescaleDB hypertables:

1. **news_articles** - News articles from all sources
2. **social_mentions** - Twitter/Reddit posts
3. **sentiment_scores** - Current aggregated sentiment
4. **sentiment_history** - Historical time-series data
5. **trending_topics** - Trending hashtags/keywords
6. **sentiment_alerts** - User-configured alerts
7. **influencers** - Tracked crypto influencers
8. **rss_feed_configs** - RSS feed configurations

## 🧪 Usage Examples

### Analyze Text

```typescript
import { hybridSentimentService } from './services/analysis/sentiment-hybrid.service';

const result = await hybridSentimentService.analyze(
  'Bitcoin is breaking out! New ATH incoming 🚀',
  {
    context: {
      symbol: 'BTC',
      author: 'crypto_whale',
      isInfluencer: true,
    }
  }
);

console.log(result);
// {
//   score: 85,
//   magnitude: 0.9,
//   label: 'very_positive',
//   confidence: 0.92,
//   provider: 'ai',
//   aspects: {
//     fear: 0.1,
//     greed: 0.8,
//     uncertainty: 0.2,
//     hype: 0.9
//   },
//   keywords: [
//     { word: 'breaking out', score: 4, weight: 0.8 },
//     { word: 'ATH', score: 5, weight: 1.0 }
//   ]
// }
```

### Aggregate Sentiment

```typescript
import { sentimentAggregator } from './services/aggregator/sentiment-aggregator.service';

const aggregated = await sentimentAggregator.aggregateFromAll(
  newsArticles,
  socialMentions,
  'BTC'
);

console.log(aggregated);
// {
//   symbol: 'BTC',
//   score: 72,
//   magnitude: 0.85,
//   label: 'very_positive',
//   confidence: 0.88,
//   trend: {
//     direction: 'improving',
//     strength: 0.65,
//     velocity: 5.2
//   },
//   volume: 1247,
//   change: 12.5,
//   dataPoints: 1247
// }
```

### Detect Trending Topics

```typescript
import { trendingTopicsService } from './services/analyzer/trending-topics.service';

const trending = await trendingTopicsService.processMentions(mentions);

console.log(trending.slice(0, 5));
// [
//   {
//     topic: '#btc',
//     type: 'hashtag',
//     mentions: 324,
//     score: 95.2,
//     velocity: 45.8,
//     trendType: 'emerging',
//     symbols: ['BTC']
//   },
//   ...
// ]
```

### Calculate Price Correlation

```typescript
import { priceCorrelationService } from './services/analyzer/price-correlation.service';

const correlation = await priceCorrelationService.calculateCorrelation(
  sentimentData,
  priceData,
  'BTC'
);

console.log(correlation);
// {
//   symbol: 'BTC',
//   coefficient: 0.72,
//   pValue: 0.003,
//   isSignificant: true,
//   strength: 'strong',
//   direction: 'positive',
//   lag: 2,  // Sentiment leads price by 2 hours
//   dataPoints: 168
// }
```

### Generate Trading Signals

```typescript
import { priceCorrelationService } from './services/analyzer/price-correlation.service';

const signal = await priceCorrelationService.generateSignals(
  currentSentiment,
  priceData,
  correlation
);

console.log(signal);
// {
//   symbol: 'BTC',
//   signal: 'strong_buy',
//   confidence: 0.87,
//   reasoning: [
//     'Strong positive sentiment (75)',
//     'Sentiment improving',
//     'Strong positive correlation (0.72)',
//     'Bullish divergence detected'
//   ],
//   sentimentScore: 75,
//   priceChange: -3.2,
//   correlation: 0.72
// }
```

## 📈 Performance

- **Local NLP**: ~5ms per analysis
- **AI Analysis**: ~500ms per analysis (Claude Haiku)
- **Hybrid Routing**: Automatically selects based on confidence
- **WebSocket**: Supports 1000+ concurrent connections
- **Batching**: Reduces message flood (configurable delay)
- **Caching**: 1-hour TTL, reduces API calls by ~60%

## 🔐 Security

- Rate limiting on all endpoints
- WebSocket client timeout (60s default)
- Max subscriptions per client (50 default)
- Message rate limiting (100/min default)
- API key validation for external services

## 📝 License

MIT

## 🤝 Contributing

This module is part of the BotCriptoFy2 trading platform. See main README for contribution guidelines.
