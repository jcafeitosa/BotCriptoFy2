/// <reference types="astro/client" />

/**
 * @fileoverview Astro Environment & Type Definitions
 * @description Type-safe definitions for Astro.locals and environment variables
 * @see https://docs.astro.build/en/guides/typescript/
 */

declare namespace App {
  /**
   * Astro.locals - Data available in all .astro files
   * @description Injected by middleware.ts via Better Auth
   */
  interface Locals {
    /**
     * Current authenticated user (from Better Auth)
     * @description null if user is not authenticated
     */
    user: {
      id: string;
      email: string;
      name: string;
      emailVerified: boolean;
      image?: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;

    /**
     * Current session (from Better Auth)
     * @description null if no active session
     */
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      ipAddress?: string;
      userAgent?: string;
    } | null;
  }
}

/**
 * Environment Variables
 * @description Type-safe access to import.meta.env
 */
interface ImportMetaEnv {
  /**
   * Backend API URL
   * @example "http://localhost:3000" | "https://api.botcriptofy.com"
   */
  readonly PUBLIC_API_URL: string;

  /**
   * Frontend URL (for OAuth callbacks)
   * @example "http://localhost:4321" | "https://app.botcriptofy.com"
   */
  readonly PUBLIC_FRONTEND_URL: string;

  /**
   * Environment name
   * @example "development" | "production" | "test"
   */
  readonly PUBLIC_ENV: "development" | "production" | "test";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
