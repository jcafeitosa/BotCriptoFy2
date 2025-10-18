# Test Patterns & Best Practices

## Test File Structure

```typescript
/**
 * [Service Name] Tests
 * Comprehensive test suite for [description]
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { ServiceUnderTest } from '../service';

// 1. Mock Dependencies
mock.module('@/db', () => ({ db: mockDb }));
mock.module('../../dependency/service', () => ({ service: mockService }));

// 2. Test Data Generators
const createTestData = (overrides?) => ({ ...defaults, ...overrides });

// 3. Test Suites
describe('ServiceName', () => {
  beforeEach(() => {
    // Reset mocks
  });

  describe('methodName', () => {
    test('should handle success case', async () => {
      // Arrange, Act, Assert
    });

    test('should handle error case', async () => {
      // Arrange, Act, Assert
    });
  });
});
```

## AAA Pattern (Arrange-Act-Assert)

```typescript
test('should create order successfully', async () => {
  // Arrange - Set up test data and mocks
  const request = createOrderRequest();
  mockDb.returning.mockImplementationOnce(() => Promise.resolve([order]));
  mockRiskService.validateTrade.mockResolvedValueOnce({ allowed: true });

  // Act - Execute the function under test
  const result = await OrderService.createOrder('user-1', 'tenant-1', request);

  // Assert - Verify the outcome
  expect(result).toBeDefined();
  expect(result.type).toBe('limit');
  expect(mockDb.insert).toHaveBeenCalled();
});
```

## Test Categories

### 1. Happy Path Tests
```typescript
test('should process valid input successfully', async () => {
  const validInput = createValidInput();
  const result = await service.process(validInput);
  expect(result.success).toBe(true);
});
```

### 2. Error Handling Tests
```typescript
test('should throw error for invalid input', async () => {
  const invalidInput = createInvalidInput();
  await expect(service.process(invalidInput)).rejects.toThrow('Invalid input');
});

test('should handle database errors gracefully', async () => {
  mockDb.select.mockRejectedValueOnce(new Error('DB Error'));
  await expect(service.getData()).rejects.toThrow('Failed to retrieve data');
});
```

### 3. Edge Case Tests
```typescript
test('should handle null inputs', async () => {
  expect(() => service.process(null)).toThrow();
});

test('should handle empty arrays', () => {
  expect(service.sumArray([])).toBe(0);
});

test('should handle maximum values', () => {
  expect(service.increment(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
});

test('should handle decimal precision', () => {
  const result = service.calculate(0.1 + 0.2);
  expect(result).toBeCloseTo(0.3);
});
```

### 4. Integration Tests
```typescript
test('should integrate with external service', async () => {
  // Test interaction between multiple services
  const result = await serviceA.callServiceB(data);
  expect(mockServiceB.method).toHaveBeenCalledWith(expect.objectContaining({
    field: expectedValue
  }));
});
```

### 5. Concurrent Operation Tests
```typescript
test('should handle concurrent requests', async () => {
  const requests = Array.from({ length: 10 }, () => service.process(data));
  const results = await Promise.all(requests);
  expect(results).toHaveLength(10);
  expect(results.every(r => r.success)).toBe(true);
});
```

## Mock Strategies

### Mock Functions
```typescript
const mockFunction = mock((param: string) => `mocked-${param}`);

// Verify calls
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith('expected-param');
expect(mockFunction).toHaveBeenCalledTimes(2);

// Clear mock
mockFunction.mockClear();
```

### Mock Implementations
```typescript
// One-time implementation
mockDb.select.mockImplementationOnce(() => Promise.resolve([data]));

// Permanent implementation
mockDb.select.mockImplementation(() => Promise.resolve([data]));

// Resolved/Rejected promises
mockService.getData.mockResolvedValueOnce(data);
mockService.getData.mockRejectedValueOnce(new Error('Failed'));
```

### Mock Modules
```typescript
mock.module('@/db', () => ({
  db: {
    select: mock(() => mockDb),
    insert: mock(() => mockDb),
    update: mock(() => mockDb),
    delete: mock(() => mockDb),
  }
}));
```

## Test Data Generators

```typescript
// Factory pattern
const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: new Date(),
  ...overrides
});

// Builder pattern
class TestUserBuilder {
  private user: Partial<User> = {};
  
  withName(name: string) {
    this.user.name = name;
    return this;
  }
  
  withEmail(email: string) {
    this.user.email = email;
    return this;
  }
  
  build(): User {
    return { ...defaultUser, ...this.user };
  }
}

const user = new TestUserBuilder()
  .withName('John')
  .withEmail('john@example.com')
  .build();
```

## Assertion Patterns

### Basic Assertions
```typescript
expect(value).toBe(expectedValue);              // ===
expect(value).toEqual(expectedObject);          // deep equality
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeTruthy();
expect(value).toBeFalsy();
```

### Number Assertions
```typescript
expect(value).toBeGreaterThan(10);
expect(value).toBeLessThan(20);
expect(value).toBeCloseTo(0.3, 2);              // for floats
```

### String Assertions
```typescript
expect(string).toContain('substring');
expect(string).toMatch(/regex/);
expect(string).toHaveLength(10);
```

### Array Assertions
```typescript
expect(array).toHaveLength(5);
expect(array).toContain(item);
expect(array).toEqual(expect.arrayContaining([item1, item2]));
```

### Object Assertions
```typescript
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });
expect(object).toEqual(expect.objectContaining({
  field: expectedValue
}));
```

### Promise Assertions
```typescript
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow('Error message');
await expect(async () => {}).rejects.toThrow(CustomError);
```

## Testing Async Code

### Promises
```typescript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Error Handling
```typescript
test('should catch async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Timeouts
```typescript
test('should complete within timeout', async () => {
  const start = Date.now();
  await service.process();
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000);
});
```

## Performance Testing

```typescript
test('should handle large datasets efficiently', async () => {
  const largeDataset = Array.from({ length: 10000 }, (_, i) => createData(i));
  
  const start = performance.now();
  await service.processAll(largeDataset);
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(5000); // < 5 seconds
});
```

## Test Organization

### Describe Blocks
```typescript
describe('ServiceName', () => {
  describe('Feature Group 1', () => {
    describe('methodA', () => {
      test('happy path', () => {});
      test('error case', () => {});
    });
  });
  
  describe('Feature Group 2', () => {
    describe('methodB', () => {
      test('happy path', () => {});
      test('error case', () => {});
    });
  });
});
```

### Setup and Teardown
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Run before each test
    resetMocks();
  });

  afterEach(() => {
    // Run after each test
    cleanup();
  });

  beforeAll(() => {
    // Run once before all tests
    setupDatabase();
  });

  afterAll(() => {
    // Run once after all tests
    teardownDatabase();
  });
});
```

## Test Naming Conventions

```typescript
// Good test names
test('should create user with valid data')
test('should throw error for invalid email')
test('should return empty array when no results found')

// Bad test names
test('test user creation')
test('invalid email')
test('empty results')
```

## Code Coverage Goals

- **Unit Tests**: 95-100% coverage
- **Integration Tests**: 80-90% coverage
- **E2E Tests**: Critical paths only

## Common Pitfalls to Avoid

1. ❌ Testing implementation details
2. ❌ Brittle tests that break on refactoring
3. ❌ Tests that depend on execution order
4. ❌ Tests with side effects
5. ❌ Overly complex test setup
6. ❌ Not testing edge cases
7. ❌ Not testing error scenarios

## Best Practices

1. ✅ Write tests first (TDD)
2. ✅ One assertion per test (when possible)
3. ✅ Test behavior, not implementation
4. ✅ Use descriptive test names
5. ✅ Keep tests simple and focused
6. ✅ Mock external dependencies
7. ✅ Test edge cases and errors
8. ✅ Make tests independent
9. ✅ Use test data generators
10. ✅ Follow AAA pattern

## Example: Complete Test File

```typescript
/**
 * User Service Tests
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { UserService } from '../user.service';

// Mocks
const mockDb = {
  select: mock(() => mockDb),
  from: mock(() => mockDb),
  where: mock(() => mockDb),
  returning: mock(() => Promise.resolve([])),
};

mock.module('@/db', () => ({ db: mockDb }));

// Test data
const createTestUser = (overrides = {}) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

describe('UserService', () => {
  beforeEach(() => {
    mockDb.select.mockClear();
    mockDb.returning.mockClear();
  });

  describe('createUser', () => {
    test('should create user with valid data', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };
      const user = createTestUser(userData);
      mockDb.returning.mockResolvedValueOnce([user]);

      // Act
      const result = await UserService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('John');
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should throw error for invalid email', async () => {
      // Arrange
      const invalidData = { name: 'John', email: 'invalid' };

      // Act & Assert
      await expect(UserService.createUser(invalidData))
        .rejects.toThrow('Invalid email');
    });
  });

  describe('getUser', () => {
    test('should retrieve user by ID', async () => {
      // Arrange
      const user = createTestUser();
      mockDb.returning.mockResolvedValueOnce([user]);

      // Act
      const result = await UserService.getUser('user-1');

      // Assert
      expect(result).toEqual(user);
    });

    test('should return null for non-existent user', async () => {
      // Arrange
      mockDb.returning.mockResolvedValueOnce([]);

      // Act
      const result = await UserService.getUser('invalid-id');

      // Assert
      expect(result).toBeNull();
    });
  });
});
```
