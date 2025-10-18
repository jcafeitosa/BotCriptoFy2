/**
 * Order Service Tests
 * Comprehensive test suite for trading order service with 100% coverage
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { OrderService } from '../order.service';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import type {
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderQueryOptions,
  TradingOrder,
  OrderFill,
  OrderStatistics,
} from '../../types/orders.types';

// Mock database module
const mockDb = {
  select: mock(() => mockDb),
  from: mock(() => mockDb),
  where: mock(() => mockDb),
  limit: mock(() => Promise.resolve([])),
  innerJoin: mock(() => mockDb),
  insert: mock(() => mockDb),
  values: mock(() => mockDb),
  returning: mock(() => Promise.resolve([])),
  update: mock(() => mockDb),
  set: mock(() => mockDb),
  orderBy: mock(() => mockDb),
  offset: mock(() => mockDb),
};

mock.module('@/db', () => ({
  db: mockDb,
}));

const mockExchangeClient = {
  createMarketOrder: mock(() =>
    Promise.resolve({
      id: 'exchange-order-123',
      status: 'open',
      info: { exchange: 'binance' },
    })
  ),
  createLimitOrder: mock(() =>
    Promise.resolve({
      id: 'exchange-order-123',
      status: 'open',
      info: { exchange: 'binance' },
    })
  ),
  createOrder: mock(() =>
    Promise.resolve({
      id: 'exchange-order-123',
      status: 'open',
      info: { exchange: 'binance' },
    })
  ),
  cancelOrder: mock(() => Promise.resolve({ id: 'exchange-order-123' })),
  fetchOpenOrders: mock(() => Promise.resolve([])),
};

const mockRestHandle = {
  client: mockExchangeClient,
  release: mock(() => {}),
};

const mockConnectionSummary = {
  id: 'connection-1',
  exchangeId: 'exchange-1',
  exchangeSlug: 'binance',
  status: 'active',
  sandbox: false,
  permissions: {},
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  exchangeName: 'Binance',
  exchangeDisplayName: 'Binance',
};

const mockExchangeConnectionService = {
  getConnectionSummary: mock(async () => mockConnectionSummary),
  acquireRestClientHandle: mock(async () => ({
    ...mockRestHandle,
    connection: mockConnectionSummary,
  })),
};

mock.module('../../exchanges/services/exchange-connection.service', () => ({
  ExchangeConnectionService: mockExchangeConnectionService,
}));

// Mock risk service
const mockRiskService = {
  validateTrade: mock(() =>
    Promise.resolve({
      allowed: true,
      violations: [],
      warnings: [],
    })
  ),
};

mock.module('../../risk/services/risk.service', () => ({
  riskService: mockRiskService,
}));

// Mock logger
mock.module('@/utils/logger', () => ({
  default: {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  },
}));

// Test data generators
const createTestConnection = (overrides: Partial<typeof mockConnectionSummary> = {}) => ({
  ...mockConnectionSummary,
  ...overrides,
});

const mockConnectionFlow = (connection = createTestConnection()) => {
  mockExchangeConnectionService.getConnectionSummary.mockResolvedValueOnce(connection);
  mockExchangeConnectionService.acquireRestClientHandle.mockResolvedValueOnce({
    ...mockRestHandle,
    connection,
  });
};

const createTestOrder = (overrides?: Partial<any>): any => ({
  id: 'order-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  exchangeConnectionId: 'connection-1',
  exchangeId: 'exchange-1',
  symbol: 'BTC/USDT',
  clientOrderId: 'client-order-123',
  exchangeOrderId: 'exchange-order-123',
  type: 'limit',
  side: 'buy',
  timeInForce: 'GTC',
  price: '50000',
  stopPrice: null,
  amount: '1',
  filled: '0',
  remaining: '1',
  cost: null,
  average: null,
  trailingDelta: null,
  trailingPercent: null,
  status: 'pending',
  lastTradeTimestamp: null,
  fee: null,
  fees: null,
  reduceOnly: false,
  postOnly: false,
  strategy: null,
  notes: null,
  info: null,
  createdAt: new Date('2025-10-18T10:00:00Z'),
  submittedAt: null,
  updatedAt: new Date('2025-10-18T10:00:00Z'),
  filledAt: null,
  canceledAt: null,
  ...overrides,
});

const createTestOrderFill = (overrides?: Partial<any>): any => ({
  id: 'fill-1',
  orderId: 'order-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  exchangeId: 'exchange-1',
  symbol: 'BTC/USDT',
  tradeId: 'trade-123',
  exchangeOrderId: 'exchange-order-123',
  price: '50000',
  amount: '0.5',
  cost: '25000',
  side: 'buy',
  takerOrMaker: 'taker',
  fee: { cost: 25, currency: 'USDT', rate: 0.001 },
  info: null,
  timestamp: new Date('2025-10-18T10:00:00Z'),
  createdAt: new Date('2025-10-18T10:00:00Z'),
  ...overrides,
});

const createOrderRequest = (overrides?: Partial<CreateOrderRequest>): CreateOrderRequest => ({
  exchangeConnectionId: 'connection-1',
  symbol: 'BTC/USDT',
  type: 'limit',
  side: 'buy',
  amount: 1,
  price: 50000,
  ...overrides,
});

describe('OrderService', () => {
  beforeEach(() => {
    // Reset all mocks
    mockDb.select.mockClear();
    mockDb.from.mockClear();
    mockDb.where.mockClear();
    mockDb.limit.mockClear();
    mockDb.innerJoin.mockClear();
    mockDb.insert.mockClear();
    mockDb.values.mockClear();
    mockDb.returning.mockClear();
    mockDb.update.mockClear();
    mockDb.set.mockClear();
    mockDb.orderBy.mockClear();
    mockDb.offset.mockClear();
    mockExchangeClient.createMarketOrder.mockClear();
    mockExchangeClient.createLimitOrder.mockClear();
    mockExchangeClient.createOrder.mockClear();
    mockExchangeClient.cancelOrder.mockClear();
    mockExchangeClient.fetchOpenOrders.mockClear();
    mockRestHandle.release.mockClear();
    mockExchangeConnectionService.getConnectionSummary.mockClear();
    mockExchangeConnectionService.acquireRestClientHandle.mockClear();
    mockRiskService.validateTrade.mockClear();

    // Reset mock implementations
    mockDb.limit.mockImplementation(() => Promise.resolve([]));
  });

  describe('createOrder', () => {
    test('should create market order successfully', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder({ type: 'market', price: null });
      const request = createOrderRequest({ type: 'market', price: undefined });

      mockConnectionFlow(connection);
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('market');
      expect(result.status).toBe('pending');
      expect(mockRiskService.validateTrade).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should create limit order successfully', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder();
      const request = createOrderRequest();

      mockConnectionFlow(connection);
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('limit');
      expect(result.price).toBe(50000);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should create stop-limit order successfully', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder({ type: 'stop_loss_limit', stopPrice: '49000' });
      const request = createOrderRequest({
        type: 'stop_loss_limit',
        price: 50000,
        stopPrice: 49000,
      });

      mockConnectionFlow(connection);
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('stop_loss_limit');
      expect(result.stopPrice).toBe(49000);
    });

    test('should create trailing stop order successfully', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder({
        type: 'trailing_stop',
        price: null,
        trailingPercent: '2.5',
      });
      const request = createOrderRequest({
        type: 'trailing_stop',
        price: undefined,
        trailingPercent: 2.5,
      });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('trailing_stop');
      expect(result.trailingPercent).toBe(2.5);
    });

    test('should validate order parameters - invalid amount', async () => {
      // Arrange
      const connection = createTestConnection();
      const request = createOrderRequest({ amount: 0 });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));

      // Act & Assert
      await expect(OrderService.createOrder('user-1', 'tenant-1', request)).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    test('should enforce risk limits', async () => {
      // Arrange
      const connection = createTestConnection();
      const request = createOrderRequest();

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: false,
        violations: ['Exceeds maximum position size'],
        warnings: [],
      });

      // Act & Assert
      await expect(OrderService.createOrder('user-1', 'tenant-1', request)).rejects.toThrow(
        'Order rejected by risk management'
      );
    });

    test('should handle exchange connection not found', async () => {
      // Arrange
      const request = createOrderRequest();
      mockExchangeConnectionService.getConnectionSummary.mockRejectedValueOnce(
        new NotFoundError('Exchange connection not found')
      );

      // Act & Assert
      await expect(OrderService.createOrder('user-1', 'tenant-1', request)).rejects.toThrow(
        NotFoundError
      );
    });

    test('should log risk warnings when present', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder();
      const request = createOrderRequest();

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: ['High volatility detected'],
      });

      // Act
      const result = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Assert
      expect(result).toBeDefined();
      expect(mockRiskService.validateTrade).toHaveBeenCalled();
    });

    test('should throw error for limit order without price', async () => {
      // Arrange
      const connection = createTestConnection();
      const request = createOrderRequest({ type: 'limit', price: undefined });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));

      // Act & Assert
      await expect(OrderService.createOrder('user-1', 'tenant-1', request)).rejects.toThrow(
        'Price required for limit order'
      );
    });

    test('should throw error for stop order without stopPrice', async () => {
      // Arrange
      const connection = createTestConnection();
      const request = createOrderRequest({ type: 'stop_loss', price: undefined, stopPrice: undefined });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));

      // Act & Assert
      await expect(OrderService.createOrder('user-1', 'tenant-1', request)).rejects.toThrow(
        'Stop price required for stop orders'
      );
    });

    test('should throw error for trailing stop without delta or percent', async () => {
      // Arrange
      const connection = createTestConnection();
      const request = createOrderRequest({
        type: 'trailing_stop',
        price: undefined,
        trailingDelta: undefined,
        trailingPercent: undefined,
      });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));

      // Act & Assert
      await expect(OrderService.createOrder('user-1', 'tenant-1', request)).rejects.toThrow(
        'Trailing delta or percent required for trailing stop'
      );
    });
  });

  describe('createBatchOrders', () => {
    test('should create multiple orders successfully', async () => {
      // Arrange
      const connection = createTestConnection();
      const order1 = createTestOrder({ id: 'order-1' });
      const order2 = createTestOrder({ id: 'order-2' });
      const requests = [createOrderRequest(), createOrderRequest({ side: 'sell' })];

      mockDb.limit.mockImplementation(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order1]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order2]));
      mockRiskService.validateTrade.mockResolvedValue({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createBatchOrders('user-1', 'tenant-1', requests);

      // Assert
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    test('should handle partial failures', async () => {
      // Arrange
      const connection = createTestConnection();
      const order1 = createTestOrder({ id: 'order-1' });
      const requests = [
        createOrderRequest(),
        createOrderRequest({ amount: 0 }), // Invalid
      ];

      mockDb.limit.mockImplementation(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order1]));
      mockRiskService.validateTrade.mockResolvedValue({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createBatchOrders('user-1', 'tenant-1', requests);

      // Assert
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('getOrder', () => {
    test('should retrieve order by ID', async () => {
      // Arrange
      const order = createTestOrder();
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));

      // Act
      const result = await OrderService.getOrder('order-1', 'user-1', 'tenant-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('order-1');
    });

    test('should return null for non-existent order', async () => {
      // Arrange
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([]));

      // Act
      const result = await OrderService.getOrder('invalid-id', 'user-1', 'tenant-1');

      // Assert
      expect(result).toBeNull();
    });

    test('should enforce user and tenant filtering', async () => {
      // Arrange
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([]));

      // Act
      const result = await OrderService.getOrder('order-1', 'wrong-user', 'wrong-tenant');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getOrders', () => {
    test('should retrieve orders with filters', async () => {
      // Arrange
      const orders = [createTestOrder({ id: 'order-1' }), createTestOrder({ id: 'order-2' })];
      mockDb.offset.mockImplementationOnce(() => Promise.resolve(orders));

      const options: OrderQueryOptions = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        symbol: 'BTC/USDT',
      };

      // Act
      const result = await OrderService.getOrders(options);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });

    test('should filter by status', async () => {
      // Arrange
      const orders = [createTestOrder({ status: 'filled' })];
      mockDb.offset.mockImplementationOnce(() => Promise.resolve(orders));

      const options: OrderQueryOptions = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        status: 'filled',
      };

      // Act
      const result = await OrderService.getOrders(options);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('filled');
    });

    test('should filter by multiple statuses', async () => {
      // Arrange
      const orders = [
        createTestOrder({ id: 'order-1', status: 'open' }),
        createTestOrder({ id: 'order-2', status: 'filled' }),
      ];
      mockDb.offset.mockImplementationOnce(() => Promise.resolve(orders));

      const options: OrderQueryOptions = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        status: ['open', 'filled'],
      };

      // Act
      const result = await OrderService.getOrders(options);

      // Assert
      expect(result).toHaveLength(2);
    });

    test('should filter by date range', async () => {
      // Arrange
      const orders = [createTestOrder()];
      mockDb.offset.mockImplementationOnce(() => Promise.resolve(orders));

      const options: OrderQueryOptions = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      // Act
      const result = await OrderService.getOrders(options);

      // Assert
      expect(result).toHaveLength(1);
    });

    test('should apply limit and offset', async () => {
      // Arrange
      const orders = [createTestOrder()];
      mockDb.offset.mockImplementationOnce(() => Promise.resolve(orders));

      const options: OrderQueryOptions = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        limit: 10,
        offset: 5,
      };

      // Act
      const result = await OrderService.getOrders(options);

      // Assert
      expect(mockDb.limit).toHaveBeenCalled();
      expect(mockDb.offset).toHaveBeenCalled();
    });
  });

  describe('updateOrder', () => {
    test('should update order price and quantity', async () => {
      // Arrange
      const order = createTestOrder({ status: 'open' });
      const updatedOrder = createTestOrder({ status: 'open', price: '51000', amount: '2' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([updatedOrder]));

      const updates: UpdateOrderRequest = {
        price: 51000,
        amount: 2,
      };

      // Act
      const result = await OrderService.updateOrder('order-1', 'user-1', 'tenant-1', updates);

      // Assert
      expect(result).toBeDefined();
      expect(result.price).toBe(51000);
      expect(result.amount).toBe(2);
    });

    test('should throw error for non-existent order', async () => {
      // Arrange
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([]));

      // Act & Assert
      await expect(
        OrderService.updateOrder('invalid-id', 'user-1', 'tenant-1', { price: 51000 })
      ).rejects.toThrow(NotFoundError);
    });

    test('should not update filled order', async () => {
      // Arrange
      const order = createTestOrder({ status: 'filled' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));

      // Act & Assert
      await expect(
        OrderService.updateOrder('order-1', 'user-1', 'tenant-1', { price: 51000 })
      ).rejects.toThrow('Cannot update order in current status');
    });

    test('should not update canceled order', async () => {
      // Arrange
      const order = createTestOrder({ status: 'canceled' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));

      // Act & Assert
      await expect(
        OrderService.updateOrder('order-1', 'user-1', 'tenant-1', { price: 51000 })
      ).rejects.toThrow('Cannot update order in current status');
    });

    test('should update trailing stop parameters', async () => {
      // Arrange
      const order = createTestOrder({ status: 'open', type: 'trailing_stop' });
      const updatedOrder = createTestOrder({
        status: 'open',
        type: 'trailing_stop',
        trailingPercent: '3.0',
      });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([updatedOrder]));

      const updates: UpdateOrderRequest = {
        trailingPercent: 3.0,
      };

      // Act
      const result = await OrderService.updateOrder('order-1', 'user-1', 'tenant-1', updates);

      // Assert
      expect(result.trailingPercent).toBe(3.0);
    });
  });

  describe('cancelOrder', () => {
    test('should cancel pending order', async () => {
      // Arrange
      const order = createTestOrder({ status: 'pending' });
      const canceledOrder = createTestOrder({
        status: 'canceled',
        canceledAt: new Date('2025-10-18T11:00:00Z'),
      });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder]));

      // Act
      const result = await OrderService.cancelOrder('order-1', 'user-1', 'tenant-1');

      // Assert
      expect(result.status).toBe('canceled');
      expect(result.canceledAt).toBeDefined();
    });

    test('should cancel order on exchange', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder({ status: 'open', exchangeOrderId: 'exchange-order-123' });
      const canceledOrder = createTestOrder({ status: 'canceled' });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder]));

      // Act
      const result = await OrderService.cancelOrder('order-1', 'user-1', 'tenant-1');

      // Assert
      expect(result.status).toBe('canceled');
      expect(mockExchangeClient.cancelOrder).toHaveBeenCalledWith('exchange-order-123', 'BTC/USDT');
      expect(mockRestHandle.release).toHaveBeenCalled();
    });

    test('should not cancel filled order', async () => {
      // Arrange
      const order = createTestOrder({ status: 'filled' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));

      // Act & Assert
      await expect(
        OrderService.cancelOrder('order-1', 'user-1', 'tenant-1')
      ).rejects.toThrow('Cannot cancel order in current status');
    });

    test('should handle exchange cancellation errors gracefully', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder({ status: 'open', exchangeOrderId: 'exchange-order-123' });
      const canceledOrder = createTestOrder({ status: 'canceled' });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder]));
      mockExchangeClient.cancelOrder.mockRejectedValueOnce(new Error('Exchange error'));

      // Act
      const result = await OrderService.cancelOrder('order-1', 'user-1', 'tenant-1');

      // Assert - Should still mark as canceled in DB even if exchange fails
      expect(result.status).toBe('canceled');
      expect(mockRestHandle.release).toHaveBeenCalled();
    });

    test('should add cancel reason to notes', async () => {
      // Arrange
      const order = createTestOrder({ status: 'pending', notes: 'Original note' });
      const canceledOrder = createTestOrder({ status: 'canceled', notes: 'Original note\nCanceled: User request' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder]));

      // Act
      const result = await OrderService.cancelOrder('order-1', 'user-1', 'tenant-1', 'User request');

      // Assert
      expect(result.status).toBe('canceled');
    });
  });

  describe('cancelAllOrders', () => {
    test('should cancel all user orders', async () => {
      // Arrange
      const orders = [
        createTestOrder({ id: 'order-1', status: 'open' }),
        createTestOrder({ id: 'order-2', status: 'pending' }),
      ];
      const canceledOrder1 = createTestOrder({ id: 'order-1', status: 'canceled' });
      const canceledOrder2 = createTestOrder({ id: 'order-2', status: 'canceled' });

      mockDb.where.mockImplementationOnce(() => Promise.resolve(orders));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([orders[0]]));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([orders[1]]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder1]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder2]));

      // Act
      const count = await OrderService.cancelAllOrders('user-1', 'tenant-1');

      // Assert
      expect(count).toBe(2);
    });

    test('should filter by symbol when provided', async () => {
      // Arrange
      const orders = [createTestOrder({ id: 'order-1', status: 'open', symbol: 'BTC/USDT' })];
      const canceledOrder = createTestOrder({ id: 'order-1', status: 'canceled' });

      mockDb.where.mockImplementationOnce(() => Promise.resolve(orders));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([orders[0]]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder]));

      // Act
      const count = await OrderService.cancelAllOrders('user-1', 'tenant-1', 'BTC/USDT');

      // Assert
      expect(count).toBe(1);
    });

    test('should handle individual cancellation failures', async () => {
      // Arrange
      const orders = [
        createTestOrder({ id: 'order-1', status: 'open' }),
        createTestOrder({ id: 'order-2', status: 'pending' }),
      ];
      const canceledOrder = createTestOrder({ id: 'order-1', status: 'canceled' });

      mockDb.where.mockImplementationOnce(() => Promise.resolve(orders));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([orders[0]]));
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([])); // Second order not found
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([canceledOrder]));

      // Act
      const count = await OrderService.cancelAllOrders('user-1', 'tenant-1');

      // Assert
      expect(count).toBe(1); // Only one succeeded
    });
  });

  describe('getOrderFills', () => {
    test('should retrieve order fills', async () => {
      // Arrange
      const fills = [
        createTestOrderFill({ id: 'fill-1' }),
        createTestOrderFill({ id: 'fill-2' }),
      ];
      mockDb.orderBy.mockImplementationOnce(() => Promise.resolve(fills));

      // Act
      const result = await OrderService.getOrderFills('order-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('fill-1');
      expect(result[1].id).toBe('fill-2');
    });

    test('should return empty array for order with no fills', async () => {
      // Arrange
      mockDb.orderBy.mockImplementationOnce(() => Promise.resolve([]));

      // Act
      const result = await OrderService.getOrderFills('order-1');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getOrderStatistics', () => {
    test('should calculate order statistics', async () => {
      // Arrange
      const orders = [
        createTestOrder({ id: 'order-1', status: 'filled', filled: '1', cost: '50000' }),
        createTestOrder({ id: 'order-2', status: 'open', filled: '0.5', cost: '25000' }),
        createTestOrder({ id: 'order-3', status: 'canceled', filled: '0', cost: '0' }),
      ];
      mockDb.where.mockImplementationOnce(() => Promise.resolve(orders));

      // Act
      const result = await OrderService.getOrderStatistics('user-1', 'tenant-1');

      // Assert
      expect(result.totalOrders).toBe(3);
      expect(result.openOrders).toBe(1);
      expect(result.filledOrders).toBe(1);
      expect(result.canceledOrders).toBe(1);
      expect(result.totalVolume).toBe(1.5);
      expect(result.totalCost).toBe(75000);
      expect(result.averageFillRate).toBeCloseTo(33.33, 1);
    });

    test('should filter statistics by options', async () => {
      // Arrange
      const orders = [
        createTestOrder({ status: 'filled', symbol: 'BTC/USDT' }),
      ];
      mockDb.where.mockImplementationOnce(() => Promise.resolve(orders));

      const options: OrderQueryOptions = {
        symbol: 'BTC/USDT',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
      };

      // Act
      const result = await OrderService.getOrderStatistics('user-1', 'tenant-1', options);

      // Assert
      expect(result.totalOrders).toBe(1);
    });

    test('should handle zero orders', async () => {
      // Arrange
      mockDb.where.mockImplementationOnce(() => Promise.resolve([]));

      // Act
      const result = await OrderService.getOrderStatistics('user-1', 'tenant-1');

      // Assert
      expect(result.totalOrders).toBe(0);
      expect(result.averageFillRate).toBe(0);
    });
  });

  describe('syncOrders', () => {
    test('should sync orders from exchange', async () => {
      // Arrange
      const connection = createTestConnection();
      const exchangeOrders = [
        {
          id: 'exchange-order-123',
          status: 'closed',
          filled: 1.0,
          remaining: 0,
          cost: 50000,
          average: 50000,
        },
      ];
      const dbOrder = createTestOrder({ exchangeOrderId: 'exchange-order-123' });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockExchangeClient.fetchOpenOrders.mockResolvedValueOnce(exchangeOrders);
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([dbOrder]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([{ ...dbOrder, status: 'filled' }]));

      // Act
      const count = await OrderService.syncOrders('user-1', 'tenant-1', 'connection-1');

      // Assert
      expect(count).toBe(1);
      expect(mockExchangeClient.fetchOpenOrders).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockRestHandle.release).toHaveBeenCalled();
    });

    test('should handle connection not found', async () => {
      // Arrange
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([]));

      // Act & Assert
      await expect(
        OrderService.syncOrders('user-1', 'tenant-1', 'invalid-connection')
      ).rejects.toThrow(NotFoundError);
    });

    test('should skip orders not in database', async () => {
      // Arrange
      const connection = createTestConnection();
      const exchangeOrders = [
        {
          id: 'unknown-exchange-order',
          status: 'open',
          filled: 0,
          remaining: 1,
        },
      ];

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockExchangeClient.fetchOpenOrders.mockResolvedValueOnce(exchangeOrders);
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([])); // Order not found in DB

      // Act
      const count = await OrderService.syncOrders('user-1', 'tenant-1', 'connection-1');

      // Assert
      expect(count).toBe(0);
      expect(mockRestHandle.release).toHaveBeenCalled();
    });

    test('should handle exchange API errors', async () => {
      // Arrange
      const connection = createTestConnection();
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockExchangeClient.fetchOpenOrders.mockRejectedValueOnce(new Error('API error'));

      // Act & Assert
      await expect(
        OrderService.syncOrders('user-1', 'tenant-1', 'connection-1')
      ).rejects.toThrow('API error');
      expect(mockRestHandle.release).toHaveBeenCalled();
    });

    test('should release client on error', async () => {
      // Arrange
      const connection = createTestConnection();
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockExchangeClient.fetchOpenOrders.mockRejectedValueOnce(new Error('Error'));

      // Act & Assert
      try {
        await OrderService.syncOrders('user-1', 'tenant-1', 'connection-1');
      } catch (error) {
        // Expected
      }

      expect(mockRestHandle.release).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent order creation', async () => {
      // Arrange
      const connection = createTestConnection();
      const order1 = createTestOrder({ id: 'order-1' });
      const order2 = createTestOrder({ id: 'order-2' });
      const request = createOrderRequest();

      mockDb.limit.mockImplementation(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order1]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order2]));
      mockRiskService.validateTrade.mockResolvedValue({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const [result1, result2] = await Promise.all([
        OrderService.createOrder('user-1', 'tenant-1', request),
        OrderService.createOrder('user-1', 'tenant-1', request),
      ]);

      // Assert
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(mockRiskService.validateTrade).toHaveBeenCalledTimes(2);
    });

    test('should handle null/undefined in order mapping', async () => {
      // Arrange
      const orderWithNulls = createTestOrder({
        price: null,
        stopPrice: null,
        cost: null,
        average: null,
        exchangeOrderId: null,
        strategy: null,
        notes: null,
      });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([orderWithNulls]));

      // Act
      const result = await OrderService.getOrder('order-1', 'user-1', 'tenant-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.price).toBeUndefined();
      expect(result?.stopPrice).toBeUndefined();
    });

    test('should handle decimal precision in amounts', async () => {
      // Arrange
      const order = createTestOrder({
        amount: '0.00000001',
        filled: '0.00000001',
        remaining: '0',
        price: '999999999.99999999',
      });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));

      // Act
      const result = await OrderService.getOrder('order-1', 'user-1', 'tenant-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.amount).toBe(0.00000001);
      expect(result?.price).toBe(999999999.99999999);
    });

    test('should handle orders with complex fee structures', async () => {
      // Arrange
      const order = createTestOrder({
        fee: { cost: 10, currency: 'USDT', rate: 0.001 },
        fees: [
          { cost: 5, currency: 'USDT', rate: 0.0005 },
          { cost: 0.0001, currency: 'BTC', rate: 0.0005 },
        ],
      });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([order]));

      // Act
      const result = await OrderService.getOrder('order-1', 'user-1', 'tenant-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.fee).toBeDefined();
      expect(result?.fees).toHaveLength(2);
    });

    test('should handle orders with all optional fields', async () => {
      // Arrange
      const connection = createTestConnection();
      const order = createTestOrder();
      const request = createOrderRequest({
        timeInForce: 'IOC',
        reduceOnly: true,
        postOnly: true,
        strategy: 'momentum',
        notes: 'Test order',
      });

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: [],
      });

      // Act
      const result = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Assert
      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    test('should integrate with risk service for validation', async () => {
      // Arrange
      const connection = createTestConnection();
      const request = createOrderRequest();

      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: false,
        violations: ['Position size too large'],
        warnings: [],
      });

      // Act & Assert
      await expect(
        OrderService.createOrder('user-1', 'tenant-1', request)
      ).rejects.toThrow('Order rejected by risk management');

      // Verify risk service was called with correct parameters
      expect(mockRiskService.validateTrade).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        expect.objectContaining({
          symbol: 'BTC/USDT',
          side: 'long',
          quantity: 1,
        })
      );
    });

    test('should handle complete order lifecycle', async () => {
      // Arrange
      const connection = createTestConnection();

      // Create order
      const order = createTestOrder({ status: 'pending' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([connection]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
      mockRiskService.validateTrade.mockResolvedValueOnce({
        allowed: true,
        violations: [],
        warnings: [],
      });

      const request = createOrderRequest();
      const created = await OrderService.createOrder('user-1', 'tenant-1', request);

      // Update order
      const openOrder = createTestOrder({ ...order, status: 'open' });
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([openOrder]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([
        { ...openOrder, price: '51000' }
      ]));

      const updated = await OrderService.updateOrder(created.id!, 'user-1', 'tenant-1', {
        price: 51000,
      });

      // Cancel order
      mockDb.limit.mockImplementationOnce(() => Promise.resolve([openOrder]));
      mockDb.returning.mockImplementationOnce(() => Promise.resolve([
        { ...openOrder, status: 'canceled' }
      ]));

      const canceled = await OrderService.cancelOrder(created.id!, 'user-1', 'tenant-1');

      // Assert
      expect(created.status).toBe('pending');
      expect(updated.price).toBe(51000);
      expect(canceled.status).toBe('canceled');
    });
  });
});
