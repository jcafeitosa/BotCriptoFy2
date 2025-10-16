/**
 * @fileoverview Better Auth Client Configuration (Frontend)
 * @description Cliente oficial do Better Auth para React
 * @see https://www.better-auth.com/docs/installation
 * @version 1.0.0
 */

import { createAuthClient } from "better-auth/react";

/**
 * Backend API URL (from environment variables)
 * @description Automatically uses correct URL based on environment
 * - Development: http://localhost:3000
 * - Production: https://api.botcriptofy.com
 */
const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

/**
 * Better Auth Client
 * @description Cliente para fazer requisições de autenticação ao backend
 * @see https://www.better-auth.com/docs/installation
 */
export const authClient = createAuthClient({
  baseURL: API_URL,

  // Fetch options (include credentials for cookie-based auth)
  fetchOptions: {
    credentials: "include",
  },
});

/**
 * Export individual methods para uso direto
 */
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  updateUser,
  changePassword,
  forgetPassword,
  resetPassword,
  verifyEmail,
} = authClient;

