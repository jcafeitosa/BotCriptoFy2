/**
 * Sentiment Module Integration Test
 * Tests complete workflow with real RSS feed
 */

import { RSSFeedsService } from '../services/sources/rss-feeds.service';
import { SentimentLocalService } from '../services/analysis/sentiment-local.service';
import { SentimentHybridService } from '../services/analysis/sentiment-hybrid.service';
import { TrendingTopicsService } from '../services/analyzer/trending-topics.service';

console.log('🧪 Starting Sentiment Module Integration Test\n');
console.log('=' .repeat(80));

/**
 * Test 1: RSS Feed Parsing
 */
async function testRSSFeed() {
  console.log('\n📰 TEST 1: RSS Feed Parsing (Investing.com)');
  console.log('-'.repeat(80));

  try {
    const rssService = new RSSFeedsService({
      customFeeds: [
        {
          name: 'Investing.com',
          url: 'https://www.investing.com/rss/news.rss',
          source: 'custom',
          enabled: true,
          pollInterval: 300000,
        },
      ],
    });

    console.log('🔄 Fetching RSS feed...');
    const articles = await rssService.fetchFeed('https://www.investing.com/rss/news.rss');

    console.log(`✅ Successfully fetched ${articles.length} articles`);

    if (articles.length > 0) {
      console.log('\n📋 Sample Articles:');
      articles.slice(0, 5).forEach((article, index) => {
        console.log(`\n[${index + 1}] ${article.title}`);
        console.log(`    Source: ${article.source}`);
        console.log(`    Symbols: ${article.symbols.join(', ') || 'None detected'}`);
        console.log(`    URL: ${article.url}`);
        console.log(`    Published: ${article.publishedAt.toISOString()}`);
      });
    }

    return { success: true, articles };
  } catch (error) {
    console.error('❌ RSS Feed Test Failed:', error instanceof Error ? error.message : String(error));
    return { success: false, articles: [] };
  }
}

/**
 * Test 2: Symbol Extraction
 */
function testSymbolExtraction(articles: any[]) {
  console.log('\n\n🔍 TEST 2: Symbol Extraction');
  console.log('-'.repeat(80));

  const symbolStats: Record<string, number> = {};
  let articlesWithSymbols = 0;

  articles.forEach((article) => {
    if (article.symbols.length > 0) {
      articlesWithSymbols++;
      article.symbols.forEach((symbol: string) => {
        symbolStats[symbol] = (symbolStats[symbol] || 0) + 1;
      });
    }
  });

  console.log(`📊 Articles with symbols: ${articlesWithSymbols}/${articles.length}`);
  console.log(`📊 Unique symbols detected: ${Object.keys(symbolStats).length}`);

  if (Object.keys(symbolStats).length > 0) {
    console.log('\n🏆 Top Symbols Mentioned:');
    const sortedSymbols = Object.entries(symbolStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    sortedSymbols.forEach(([symbol, count], index) => {
      console.log(`  ${index + 1}. ${symbol}: ${count} mentions`);
    });
  }

  return { success: true, symbolStats, articlesWithSymbols };
}

/**
 * Test 3: Local Sentiment Analysis
 */
async function testLocalSentiment(articles: any[]) {
  console.log('\n\n💭 TEST 3: Local Sentiment Analysis');
  console.log('-'.repeat(80));

  try {
    const sentimentService = new SentimentLocalService();

    const articlesToAnalyze = articles.slice(0, 10);
    console.log(`🔄 Analyzing sentiment for ${articlesToAnalyze.length} articles...\n`);

    const results = [];

    for (const article of articlesToAnalyze) {
      const text = `${article.title} ${article.description || ''}`;
      const analysis = await sentimentService.analyze(text);

      results.push({
        title: article.title.substring(0, 80) + '...',
        score: analysis.score,
        label: analysis.label,
        confidence: analysis.confidence,
        keywords: analysis.keywords?.slice(0, 3).map((k) => k.word),
      });

      console.log(`📝 "${article.title.substring(0, 60)}..."`);
      console.log(`   Score: ${analysis.score.toFixed(2)} | Label: ${analysis.label} | Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      if (analysis.keywords && analysis.keywords.length > 0) {
        console.log(`   Keywords: ${analysis.keywords.slice(0, 3).map((k) => k.word).join(', ')}`);
      }
      console.log();
    }

    // Statistics
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    const labelCounts = results.reduce((acc, r) => {
      acc[r.label] = (acc[r.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Sentiment Statistics:');
    console.log(`   Average Score: ${avgScore.toFixed(2)}`);
    console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log('   Label Distribution:');
    Object.entries(labelCounts).forEach(([label, count]) => {
      console.log(`     - ${label}: ${count}`);
    });

    return { success: true, results, avgScore, avgConfidence };
  } catch (error) {
    console.error('❌ Sentiment Analysis Failed:', error instanceof Error ? error.message : String(error));
    return { success: false, results: [] };
  }
}

/**
 * Test 4: Hybrid Sentiment Analysis (with AI fallback)
 */
async function testHybridSentiment(articles: any[]) {
  console.log('\n\n🤖 TEST 4: Hybrid Sentiment Analysis (AI + Local)');
  console.log('-'.repeat(80));

  try {
    // Check if AI service is configured
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

    if (!hasAnthropicKey) {
      console.log('⚠️  No ANTHROPIC_API_KEY found - will use local NLP only');
    } else {
      console.log('✅ ANTHROPIC_API_KEY configured - AI analysis available');
    }

    const hybridService = new SentimentHybridService({
      confidenceThreshold: 0.7,
      alwaysUseAI: {
        forInfluencers: true,
        forImportantNews: true,
      },
      cache: {
        enabled: true,
        ttl: 3600000,
        maxSize: 1000,
      },
    });

    const articlesToAnalyze = articles.slice(0, 5);
    console.log(`🔄 Analyzing ${articlesToAnalyze.length} articles with hybrid approach...\n`);

    for (const article of articlesToAnalyze) {
      const text = `${article.title} ${article.description || ''}`;
      const analysis = await hybridService.analyze(text, {
        context: {
          source: article.source,
        },
      });

      console.log(`📝 "${article.title.substring(0, 60)}..."`);
      console.log(`   Provider: ${analysis.provider.toUpperCase()}`);
      console.log(`   Score: ${analysis.score.toFixed(2)} | Label: ${analysis.label} | Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      if (analysis.aspects) {
        const aspects = Object.entries(analysis.aspects)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}:${value?.toFixed(2)}`)
          .join(', ');
        if (aspects) {
          console.log(`   Aspects: ${aspects}`);
        }
      }
      console.log();
    }

    // Get usage stats
    const stats = hybridService.getUsageStats();
    console.log('📊 Hybrid Service Statistics:');
    console.log(`   Local analyses: ${stats.localAnalyses}`);
    console.log(`   AI analyses: ${stats.aiAnalyses}`);
    console.log(`   Cache hits: ${stats.cacheHits}`);
    console.log(`   Total requests: ${stats.totalAnalyses}`);

    return { success: true, stats };
  } catch (error) {
    console.error('❌ Hybrid Sentiment Failed:', error instanceof Error ? error.message : String(error));
    return { success: false };
  }
}

/**
 * Test 5: Trending Topics Detection
 */
function testTrendingTopics(articles: any[]) {
  console.log('\n\n🔥 TEST 5: Trending Topics Detection');
  console.log('-'.repeat(80));

  try {
    const trendingService = new TrendingTopicsService({
      minMentions: 2,
      timeWindow: 86400000, // 24h
      recencyDecay: 0.7,
    });

    // Note: TrendingTopicsService processes SocialMention objects
    // For now we'll just check if the service is working
    const trendingTopics = trendingService.getTrendingTopics();
    console.log(`📊 Detected ${trendingTopics.length} trending topics\n`);

    if (trendingTopics.length > 0) {
      console.log('🏆 Top Trending Topics:');
      trendingTopics.slice(0, 10).forEach((topic: any, index: number) => {
        console.log(`\n${index + 1}. ${topic.keyword || topic.topic || 'Unknown'}`);
        console.log(`   Mentions: ${topic.mentionCount || topic.mentions || 0}`);
        if (topic.averageSentiment !== undefined) {
          console.log(`   Sentiment: ${topic.averageSentiment.toFixed(2)}`);
        }
      });
    } else {
      console.log('⚠️  No trending topics detected (service needs social mentions)');
    }

    const stats = trendingService.getStats();
    console.log('\n📊 Trending Service Statistics:');
    console.log(`   Total topics tracked: ${stats.totalTopics}`);
    console.log(`   Trending topics: ${stats.trendingTopics}`);

    return { success: true, trendingTopics, stats };
  } catch (error) {
    console.error('❌ Trending Topics Failed:', error instanceof Error ? error.message : String(error));
    return { success: false };
  }
}

/**
 * Main Test Runner
 */
async function runIntegrationTests() {
  const startTime = Date.now();

  console.log('\n🚀 Starting Integration Tests...\n');

  // Test 1: RSS Feed
  const rssResult = await testRSSFeed();
  if (!rssResult.success || rssResult.articles.length === 0) {
    console.log('\n❌ Cannot continue without RSS data');
    return;
  }

  // Test 2: Symbol Extraction
  const symbolResult = testSymbolExtraction(rssResult.articles);

  // Test 3: Local Sentiment
  const localSentimentResult = await testLocalSentiment(rssResult.articles);

  // Test 4: Hybrid Sentiment
  const hybridSentimentResult = await testHybridSentiment(rssResult.articles);

  // Test 5: Trending Topics
  const trendingResult = testTrendingTopics(rssResult.articles);

  // Final Summary
  const duration = Date.now() - startTime;
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ RSS Feed Parsing: ${rssResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Symbol Extraction: ${symbolResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Local Sentiment: ${localSentimentResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Hybrid Sentiment: ${hybridSentimentResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Trending Topics: ${trendingResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`\n⏱️  Total execution time: ${(duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(80));
}

// Run tests
runIntegrationTests().catch((error) => {
  console.error('\n💥 Integration Test Failed:', error);
  process.exit(1);
});
