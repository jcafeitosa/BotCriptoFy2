import { beforeEach, describe, expect, mock, test } from 'bun:test';

const configurationRow = {
  id: 'cfg-1',
  exchangeId: 'ex-1',
  exchangeSlug: 'binance',
  status: 'active',
  sandbox: false,
  permissions: {},
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastSyncAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
};

const configurationWithSecrets = {
  ...configurationRow,
  apiKey: 'key',
  apiSecret: 'secret',
  passphrase: null,
};

const exchangeConfigMocks = {
  getConfigurationWithSecrets: mock(async () => configurationWithSecrets),
  updateSyncMetadata: mock(async () => undefined),
  listConfigurations: mock(async () => [configurationRow]),
  getConfigurationById: mock(async () => configurationRow),
  createConfiguration: mock(async () => configurationRow),
};

const exchangeServiceMocks = {
  getExchangeBySlug: mock(async () => ({ name: 'Binance', displayName: 'Binance' })),
  getExchangeInfo: mock(async () => ({
    id: 'binance',
    name: 'Binance',
    has: { fetchTicker: true, fetchOHLCV: true },
    urls: {},
    rateLimit: 1200,
  })),
  resolveExchangeId: mock(() => 'binance'),
  createCCXTInstance: mock(() => ({
    checkRequiredCredentials: () => undefined,
    fetchBalance: async () => ({ total: {}, free: {}, used: {}, info: {} }),
  })),
  getExchangeBySlugSync: mock(() => ({ name: 'Binance', displayName: 'Binance' })),
};

mock.module('../exchange-config.service', () => ({
  ExchangeConfigurationService: exchangeConfigMocks,
}));

mock.module('../exchange.service', () => ({
  ExchangeService: {
    ...exchangeServiceMocks,
    getExchangeBySlug: exchangeServiceMocks.getExchangeBySlug,
    getExchangeInfo: exchangeServiceMocks.getExchangeInfo,
    resolveExchangeId: exchangeServiceMocks.resolveExchangeId,
    createCCXTInstance: exchangeServiceMocks.createCCXTInstance,
  },
}));

import { ExchangeConnectionService } from '../exchange-connection.service';

describe('ExchangeConnectionService', () => {
  beforeEach(() => {
    exchangeConfigMocks.getConfigurationWithSecrets.mockClear();
    exchangeConfigMocks.updateSyncMetadata.mockClear();
    exchangeConfigMocks.listConfigurations.mockClear();
    exchangeConfigMocks.getConfigurationById.mockClear();
  });

  test('listConnections returns summaries with metadata', async () => {
    const connections = await ExchangeConnectionService.listConnections({
      userId: 'user-1',
      tenantId: 'tenant-1',
    });

    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      exchangeSlug: 'binance',
      exchangeDisplayName: 'Binance',
      status: 'active',
    });
    expect(exchangeConfigMocks.listConfigurations).toHaveBeenCalledWith({
      userId: 'user-1',
      tenantId: 'tenant-1',
    });
  });

  test('getConnectionStatus merges metadata and info', async () => {
    const status = await ExchangeConnectionService.getConnectionStatus({
      userId: 'user-1',
      tenantId: 'tenant-1',
      configurationId: 'cfg-1',
    });

    expect(status.connection.exchangeName).toBe('Binance');
    expect(status.exchange.id).toBe('binance');
    expect(status.capabilities.rest).toContain('fetchTicker');
  });
});
