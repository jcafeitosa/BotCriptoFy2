/**
 * Type declarations for sentiment (VADER sentiment analyzer)
 * https://www.npmjs.com/package/sentiment
 */

declare module 'sentiment' {
  interface SentimentAnalysis {
    score: number;
    comparative: number;
    calculation: Array<{
      [word: string]: number;
    }>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  interface SentimentOptions {
    extras?: {
      [word: string]: number;
    };
  }

  class Sentiment {
    constructor();
    analyze(text: string, options?: SentimentOptions): SentimentAnalysis;
    registerLanguage(languageCode: string, language: any): void;
  }

  export = Sentiment;
}
