/**
 * @fileoverview Astro Middleware - Better Auth Integration
 * @description Server-side authentication and route protection
 * @version 1.0.0
 * @see https://docs.astro.build/en/guides/middleware/
 * @see https://www.better-auth.com/docs/integrations/astro
 */

import { defineMiddleware } from "astro:middleware";

/**
 * Better Auth Session Type
 */
interface BetterAuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Session Cache
 * PERFORMANCE: Cache session validation for 30 seconds
 * Prevents hitting rate limits on rapid requests
 */
interface CachedSession {
  data: BetterAuthSession | null;
  timestamp: number;
  cookieHash: string;
}

const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Generate hash from cookies for cache key
 */
function hashCookies(cookieHeader: string): string {
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < cookieHeader.length; i++) {
    const char = cookieHeader.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

/**
 * Get session from Better Auth backend (with caching)
 * PERFORMANCE: Caches session for 30s to reduce backend load and avoid rate limits
 */
async function getSession(request: Request): Promise<BetterAuthSession | null> {
  try {
    const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

    // SECURITY: Get Better Auth cookies from request headers
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
      console.log("[Middleware] No cookies found");
      return null;
    }

    // PERFORMANCE: Check cache first
    const cacheKey = hashCookies(cookieHeader);
    const cached = sessionCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log("[Middleware] ✓ Session from cache (age:", Math.floor((now - cached.timestamp) / 1000), "s)");
      return cached.data;
    }

    // Cache miss or expired - fetch from backend
    console.log("[Middleware] → Fetching session from backend...");

    const response = await fetch(`${API_URL}/api/auth/get-session`, {
      method: "GET",
      headers: {
        "Cookie": cookieHeader,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    console.log("[Middleware] Session check response status:", response.status);

    let sessionData: BetterAuthSession | null = null;

    if (response.ok) {
      const data = await response.json();

      // FIX: Handle null or undefined response from backend
      if (!data) {
        console.log("[Middleware] Backend returned null/undefined data");
        sessionData = null;
      } else {
        console.log("[Middleware] Session data:", data.user ? `User: ${data.user.email}` : "No user");
        sessionData = data.session && data.user ? { session: data.session, user: data.user } : null;
      }
    } else {
      console.log("[Middleware] Session check failed:", response.status);
    }

    // PERFORMANCE: Store in cache
    sessionCache.set(cacheKey, {
      data: sessionData,
      timestamp: now,
      cookieHash: cacheKey,
    });

    // CLEANUP: Remove old cache entries (keep max 100 entries)
    if (sessionCache.size > 100) {
      const oldestKey = sessionCache.keys().next().value;
      sessionCache.delete(oldestKey);
    }

    return sessionData;
  } catch (error) {
    console.error("[Middleware] Failed to get session:", error);
    return null;
  }
}

/**
 * Protected route patterns
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/admin",
  "/dashboard/trader",
  "/dashboard/influencer",
];

/**
 * Public routes (always accessible)
 */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/change-password",
];

/**
 * Middleware: Authentication & Route Protection
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect, request } = context;
  const pathname = url.pathname;

  // PERFORMANCE: Skip middleware for static assets, API routes, and files
  if (
    pathname.startsWith("/_astro") ||  // Astro build assets
    pathname.startsWith("/api") ||      // API routes
    pathname.startsWith("/@") ||        // Vite HMR
    pathname.startsWith("/node_modules") || // Node modules
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)  // Files with extensions
  ) {
    return next();
  }

  // Get session from Better Auth
  const sessionData = await getSession(request);

  // Inject user and session into Astro.locals (type-safe)
  context.locals.user = sessionData?.user || null;
  context.locals.session = sessionData?.session || null;

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !sessionData?.user) {
    console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to /login`);
    return redirect("/login");
  }

  // Redirect authenticated users from auth pages to dashboard
  const isAuthPage = ["/login", "/register"].includes(pathname);
  if (isAuthPage && sessionData?.user) {
    console.log(`[Middleware] Redirecting authenticated user from ${pathname} to /dashboard`);
    return redirect("/dashboard");
  }

  // Continue to next middleware or page
  return next();
});
