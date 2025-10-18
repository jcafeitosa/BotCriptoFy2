/**
 * Type declarations for feedparser
 * https://www.npmjs.com/package/feedparser
 */

declare module 'feedparser' {
  import { Readable, Transform } from 'stream';

  interface FeedParserOptions {
    feedurl?: string;
    normalize?: boolean;
    addmeta?: boolean;
    resume_saxerror?: boolean;
  }

  interface FeedParserItem {
    title?: string;
    description?: string;
    summary?: string;
    link?: string;
    author?: string;
    creator?: string;
    pubdate?: Date;
    published?: Date;
    guid?: string;
    image?: {
      url?: string;
      title?: string;
    };
    enclosures?: Array<{
      url: string;
      type?: string;
      length?: number;
    }>;
    'media:content'?: {
      $?: {
        url?: string;
      };
    };
    categories?: string[];
    [key: string]: any;
  }

  class FeedParser extends Transform {
    constructor(options?: FeedParserOptions);

    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'readable', listener: () => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'data', listener: (item: FeedParserItem) => void): this;

    read(): FeedParserItem | null;
  }

  export = FeedParser;
}
