import { describe, test, expect, mock } from 'bun:test';
import { walletService } from '../wallet.service';

describe('walletService.exportTransactionsCsv', () => {
  test('exports CSV with headers and rows', async () => {
    const rows = [
      {
        id: 'tx1', walletId: 'w1', userId: 'u1', tenantId: 't1', type: 'deposit', asset: 'BTC',
        amount: '0.1', fee: '0', status: 'completed', fromWalletId: null, toWalletId: null,
        fromAddress: 'addrA', toAddress: null, txHash: 'hash1', blockchainNetwork: 'BTC', description: 'initial',
        createdAt: new Date('2025-01-01T00:00:00Z'), processedAt: new Date('2025-01-01T00:01:00Z'), confirmedAt: null,
      },
      {
        id: 'tx2', walletId: 'w1', userId: 'u1', tenantId: 't1', type: 'transfer', asset: 'USDT',
        amount: '50', fee: '0', status: 'completed', fromWalletId: 'w1', toWalletId: 'w2',
        fromAddress: null, toAddress: null, txHash: null, blockchainNetwork: null, description: 'move to savings',
        createdAt: new Date('2025-01-02T00:00:00Z'), processedAt: new Date('2025-01-02T00:00:10Z'), confirmedAt: null,
      },
    ] as any[];

    const original = (walletService as any).getTransactions;
    (walletService as any).getTransactions = mock(() => Promise.resolve(rows));

    const csv = await walletService.exportTransactionsCsv({ walletId: 'w1', userId: 'u1' });
    (walletService as any).getTransactions = original;

    const lines = csv.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('id,walletId,userId');
    expect(lines[1]).toContain('tx1');
    expect(lines[2]).toContain('tx2');
  });
});

