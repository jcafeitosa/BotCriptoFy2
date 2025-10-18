import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { affiliatePublicRoutes } from '../routes/public.routes';
import { AffiliateReferralService } from '../services';

describe('smoke: rota pública de clique de afiliado', () => {
  it('deve aceitar POST /api/v1/affiliate/public/click e retornar sucesso', async () => {
    // Stub do serviço para evitar dependência de DB
    const original = AffiliateReferralService.trackClick;
    (AffiliateReferralService as any).trackClick = async (data: any) => ({
      id: 'click-1',
      affiliateId: 'aff-1',
      affiliateCode: data.affiliateCode,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      createdAt: new Date(),
      metadata: null,
    });

    const app = new Elysia().use(affiliatePublicRoutes);
    const req = new Request('http://localhost/api/v1/affiliate/public/click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'bun-test' },
      body: JSON.stringify({ affiliateCode: 'AFF-ABCDEFGH' }),
    });

    const res = await app.handle(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.affiliateCode).toBe('AFF-ABCDEFGH');

    // Restaura o stub
    (AffiliateReferralService as any).trackClick = original;
  });
});

