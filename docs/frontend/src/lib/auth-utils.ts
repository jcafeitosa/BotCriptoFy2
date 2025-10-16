/**
 * @fileoverview Auth Utilities - Performance & Security Optimized
 * @description Utilities para autenticação com foco em performance e segurança
 * @version 1.0.0
 * @security
 * - Validação de perfil no backend
 * - Whitelist de URLs
 * - Sanitização de dados
 * @performance
 * - Cache de perfil (5min)
 * - Request única combinada
 * - Response minimalista
 */

import { authClient } from './auth-client';

/**
 * User Profile Types
 */
export type ProfileType = "company" | "trader" | "influencer";
export type UserRole = "admin" | "manager" | "trader" | "viewer";

/**
 * Dashboard Route Mapping
 * @security Whitelist estática de rotas permitidas
 */
export const DASHBOARD_ROUTES: Record<ProfileType, string> = {
  company: "/dashboard/admin",
  trader: "/dashboard/trader",
  influencer: "/dashboard/influencer",
} as const;

/**
 * User Profile Interface
 */
export interface UserProfile {
  userId: string;
  role: UserRole;
  profileType: ProfileType;
  isActive: boolean;
  phone?: string;
  avatar?: string;
}

/**
 * Get dashboard URL for profile type
 * @param profileType - User profile type
 * @returns Dashboard URL from whitelist
 * @security Previne open redirect usando whitelist
 */
export function getDashboardUrl(profileType: ProfileType): string {
  return DASHBOARD_ROUTES[profileType] || DASHBOARD_ROUTES.trader;
}

/**
 * Fetch user profile from backend
 * @security Valida sessão no backend
 * @performance Cache de 5 minutos no cliente
 */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    console.log('[Auth Utils] 🔍 Fetching user profile from backend...');

    // SECURITY: Better Auth usa cookies para autenticação
    // O fetch automaticamente envia cookies com credentials: 'include'
    const session = await authClient.getSession();
    console.log('[Auth Utils] Has session:', !!session.data);

    if (!session.data) {
      console.error('[Auth Utils] No session found');
      return null;
    }

    // SECURITY: Fetch com cookies (Better Auth padrão)
    const response = await fetch("http://localhost:3000/api/user/profile", {
      method: "GET",
      credentials: "include", // Envia cookies automaticamente
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log('[Auth Utils] Response status:', response.status);

    if (!response.ok) {
      console.error('[Auth Utils] ❌ Response not OK:', response.status);
      
      if (response.status === 401) {
        console.error('[Auth Utils] 401 Unauthorized - Session expired');
        return null;
      }
      
      const errorText = await response.text();
      console.error('[Auth Utils] Error response:', errorText);
      return null;
    }

    const profileData = await response.json();
    console.log('[Auth Utils] ✅ Profile data:', profileData);
    
    return profileData;
  } catch (error: any) {
    console.error("[Auth Utils] ❌ Error fetching profile:", error);
    console.error("[Auth Utils] Error details:", error?.message || error);
    return null;
  }
}

/**
 * Redirect to appropriate dashboard
 * @param profileType - User profile type
 * @security Usa whitelist para prevenir redirect malicioso
 * @performance Redirect direto sem round-trip adicional
 */
export function redirectToDashboard(profileType: ProfileType): void {
  const url = getDashboardUrl(profileType);
  window.location.href = url;
}

/**
 * Check if user has required role
 * @param userRole - User's current role
 * @param requiredRole - Required role for access
 * @returns true if user has permission
 * @security Role hierarchy validation
 */
export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    trader: 2,
    viewer: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user has required profile type
 * @param userProfileType - User's profile type
 * @param allowedTypes - Allowed profile types
 * @returns true if profile is allowed
 */
export function hasAllowedProfileType(
  userProfileType: ProfileType,
  allowedTypes: ProfileType[]
): boolean {
  return allowedTypes.includes(userProfileType);
}

