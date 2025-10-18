import { describe, it, expect } from 'bun:test';
import { selectCommissionsForAmount } from '../utils/payout-selection';

describe('seleção de comissões para pagamento', () => {
  const commissions = [
    { id: 'c1', amount: '10.00' },
    { id: 'c2', amount: '50.00' },
    { id: 'c3', amount: '25.00' },
    { id: 'c4', amount: '5.00' },
  ];

  it('seleciona exatamente o alvo quando possível', () => {
    const res = selectCommissionsForAmount(commissions, 15);
    // espera-se c4(5) + c1(10) = 15
    expect(res.selectedSum).toBe(15);
    expect(res.selectedIds.sort()).toEqual(['c1', 'c4'].sort());
  });

  it('excede levemente o alvo quando necessário', () => {
    const res = selectCommissionsForAmount(commissions, 30); // 25 + 5 = 30, exato
    expect(res.selectedSum).toBe(30);
    expect(res.selectedIds.sort()).toEqual(['c3', 'c4'].sort());
  });

  it('retorna vazio quando alvo <= 0', () => {
    const res = selectCommissionsForAmount(commissions, 0);
    expect(res.selectedSum).toBe(0);
    expect(res.selectedIds.length).toBe(0);
  });
});

