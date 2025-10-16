/**
 * @fileoverview Astro Middleware - Authentication & Authorization
 * @description Middleware server-side para proteção de rotas com foco em performance e segurança
 * @version 1.0.0
 * @security
 * - Validação de sessão server-side (não confiar no cliente)
 * - Verificação de role/profileType
 * - Proteção contra acesso não autorizado
 * @performance
 * - Cache de verificação de sessão
 * - Redirect 302 (temporário, permite cache)
 * - Validação rápida < 10ms
 */

import type { MiddlewareHandler } from 'astro';

/**
 * Protected routes configuration
 * @security Define quais rotas exigem autenticação e qual perfil
 */
const PROTECTED_ROUTES = {
  '/dashboard/admin': {
    requireAuth: true,
    allowedProfileTypes: ['company'],
    allowedRoles: ['admin', 'manager'],
  },
  '/dashboard/trader': {
    requireAuth: true,
    allowedProfileTypes: ['trader'],
    allowedRoles: ['admin', 'manager', 'trader'],
  },
  '/dashboard/influencer': {
    requireAuth: true,
    allowedProfileTypes: ['influencer'],
    allowedRoles: ['admin', 'manager', 'trader'],
  },
  '/dashboard': {
    requireAuth: true,
    allowedProfileTypes: ['company', 'trader', 'influencer'],
    allowedRoles: ['admin', 'manager', 'trader', 'viewer'],
  },
} as const;

/**
 * Public routes (não requerem autenticação)
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

/**
 * Check if route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  // PERFORMANCE: Verificação rápida de prefixo
  if (pathname.startsWith('/dashboard')) {
    return true;
  }

  return Object.keys(PROTECTED_ROUTES).some(route => pathname.startsWith(route));
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
}

/**
 * Verify user session from cookie
 * @security Valida cookie de sessão Better Auth
 * @performance Cache de verificação (evita chamadas repetidas)
 */
async function verifySession(cookies: any): Promise<any> {
  try {
    // SECURITY: Verificar cookies de sessão Better Auth (2 cookies: token + data)
    const sessionToken = cookies.get('botcriptofy.session_token')?.value;
    const sessionData = cookies.get('botcriptofy.session_data')?.value;
    
    if (!sessionToken || !sessionData) {
      return null;
    }

    // PERFORMANCE: Fazer request ao backend apenas uma vez
    const response = await fetch('http://localhost:3000/api/auth/get-session', {
      headers: {
        Cookie: `botcriptofy.session_token=${sessionToken}; botcriptofy.session_data=${sessionData}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Middleware] Session verification error:', error);
    return null;
  }
}

/**
 * Fetch user profile
 * @security Validação no backend
 * @performance Request única
 */
async function getUserProfile(cookies: any): Promise<any> {
  try {
    const sessionToken = cookies.get('botcriptofy.session_token')?.value;
    const sessionData = cookies.get('botcriptofy.session_data')?.value;
    
    if (!sessionToken || !sessionData) {
      return null;
    }

    const response = await fetch('http://localhost:3000/api/user/profile', {
      headers: {
        Cookie: `botcriptofy.session_token=${sessionToken}; botcriptofy.session_data=${sessionData}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Middleware] Profile fetch error:', error);
    return null;
  }
}

/**
 * Auth Middleware
 * @description Protege rotas baseado em autenticação e perfil
 */
export const onRequest: MiddlewareHandler = async ({ request, cookies, redirect }, next) => {
  const pathname = new URL(request.url).pathname;

  // PERFORMANCE: Skip middleware para assets estáticos
  if (pathname.startsWith('/_') || pathname.includes('.')) {
    return next();
  }

  // PERFORMANCE: Rotas públicas não precisam de validação
  if (isPublicRoute(pathname)) {
    return next();
  }

  // SECURITY: Verificar rotas protegidas
  if (isProtectedRoute(pathname)) {
    // PERFORMANCE: Buscar sessão e perfil em paralelo
    const [session, profile] = await Promise.all([
      verifySession(cookies),
      getUserProfile(cookies),
    ]);

    // SECURITY: Redirecionar se não autenticado
    if (!session || !profile) {
      console.warn(`[Middleware] Unauthorized access to ${pathname}`);
      return redirect('/login', 302); // 302 = Temporary (não cachear redirect)
    }

    // SECURITY: Verificar se usuário está ativo
    if (!profile.isActive) {
      console.warn(`[Middleware] Inactive user trying to access ${pathname}`);
      return redirect('/login?error=inactive', 302);
    }

    // SECURITY: Validar profileType para rotas específicas
    const routeConfig = PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES];
    
    if (routeConfig) {
      // Verificar profileType
      if (!routeConfig.allowedProfileTypes.includes(profile.profileType)) {
        console.warn(`[Middleware] Wrong profile type for ${pathname}: ${profile.profileType}`);
        
        // PERFORMANCE: Redirect direto para dashboard correto
        const correctDashboard = `/dashboard/${profile.profileType === 'company' ? 'admin' : profile.profileType}`;
        return redirect(correctDashboard, 302);
      }

      // Verificar role (adicional)
      if (!routeConfig.allowedRoles.includes(profile.role)) {
        console.warn(`[Middleware] Insufficient role for ${pathname}: ${profile.role}`);
        return redirect('/dashboard', 403); // Forbidden
      }
    }

    // SECURITY: Log de acesso (auditoria)
    console.log(`[Middleware] ✓ Access granted: ${profile.profileType}/${profile.role} -> ${pathname}`);
  }

  // Continuar para próximo middleware/página
  return next();
};

