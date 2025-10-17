# P2P Marketplace Module

Peer-to-peer cryptocurrency trading marketplace with escrow, chat, disputes, and reputation system.

## Features

### Core Trading
- ✅ Buy/Sell orders (market, limit, floating price)
- ✅ Automated order matching algorithm
- ✅ Escrow system for secure trades
- ✅ Multi-payment methods support
- ✅ Fee structure (maker/taker)

### Communication
- ✅ Real-time chat between traders
- ✅ File attachments support
- ✅ System messages
- ✅ Read receipts

### Dispute Resolution
- ✅ Automated dispute analysis
- ✅ Evidence submission
- ✅ Admin arbitration
- ✅ Escrow actions (release/refund/split)

### Reputation System
- ✅ 5-star rating system
- ✅ User reviews and comments
- ✅ Completion rate tracking
- ✅ Trust levels (Elite, Expert, Verified, etc.)
- ✅ Reputation badges

## Database Schema

### Tables (8)
- `p2p_orders` - Buy/sell orders
- `p2p_trades` - Individual trades
- `p2p_escrow` - Funds in escrow
- `p2p_messages` - Chat messages
- `p2p_disputes` - Dispute cases
- `p2p_reputation` - Reviews and ratings
- `p2p_payment_methods` - Saved payment methods
- `p2p_fees` - Fee structure

## API Endpoints

### Orders (~35 endpoints)
```
POST   /api/v1/p2p/orders              Create order
GET    /api/v1/p2p/orders              List orders
GET    /api/v1/p2p/orders/:id          Get order
PATCH  /api/v1/p2p/orders/:id          Update order
DELETE /api/v1/p2p/orders/:id          Cancel order
```

### Trading
```
POST   /api/v1/p2p/trading                       Create trade
POST   /api/v1/p2p/trading/:id/payment-sent      Confirm payment sent
POST   /api/v1/p2p/trading/:id/payment-received  Confirm payment received
POST   /api/v1/p2p/trading/:id/complete          Complete trade
POST   /api/v1/p2p/trading/match                 Find matching orders
```

### Chat
```
POST   /api/v1/p2p/chat                Send message
GET    /api/v1/p2p/chat/:tradeId       Get trade messages
POST   /api/v1/p2p/chat/:id/read       Mark as read
```

### Disputes
```
POST   /api/v1/p2p/disputes              Create dispute
POST   /api/v1/p2p/disputes/:id/resolve  Resolve dispute
```

### Reputation
```
POST   /api/v1/p2p/reputation                  Create review
GET    /api/v1/p2p/reputation/users/:id/stats Get user stats
```

### Payment Methods
```
POST   /api/v1/p2p/payment-methods   Create payment method
GET    /api/v1/p2p/payment-methods   Get user payment methods
```

## Algorithms

### Order Matching
Multi-factor scoring algorithm:
- Price competitiveness (40%)
- User reputation (30%)
- Availability (20%)
- Payment method match (10%)

### Fee Calculator
Volume-based tiers:
- $0-10k: 0.1% maker / 0.2% taker
- $10k-50k: 0.08% maker / 0.15% taker
- $50k-100k: 0.06% maker / 0.12% taker
- $100k-500k: 0.04% maker / 0.1% taker
- $500k+: 0.02% maker / 0.08% taker

### Reputation Score
Weighted calculation:
- Average rating (40%)
- Completion rate (30%)
- Total trades (20%)
- Dispute penalty (10%)

### Dispute Resolver
Automated analysis with:
- Evidence quality scoring
- Clear-cut case detection
- Fair split recommendations
- Penalty suggestions

## Usage Examples

### Create a Sell Order
```typescript
POST /api/v1/p2p/orders
{
  "orderType": "sell",
  "cryptocurrency": "BTC",
  "fiatCurrency": "USD",
  "priceType": "limit",
  "price": 45000,
  "minAmount": 0.001,
  "maxAmount": 1,
  "availableAmount": 0.5,
  "paymentMethods": ["bank_transfer", "pix"],
  "paymentTimeLimit": 30,
  "terms": "Please transfer within 30 minutes"
}
```

### Find Matching Orders
```typescript
POST /api/v1/p2p/trading/match
{
  "amount": 0.1,
  "fiatCurrency": "USD",
  "cryptocurrency": "BTC",
  "paymentMethods": ["bank_transfer"]
}
```

### Create Trade
```typescript
POST /api/v1/p2p/trading
{
  "orderId": "uuid",
  "sellerId": "seller-uuid",
  "cryptoAmount": 0.1,
  "fiatAmount": 4500,
  "price": 45000,
  "paymentMethod": "bank_transfer",
  "paymentDetails": {
    "accountNumber": "12345",
    "bankName": "Example Bank"
  }
}
```

### Send Chat Message
```typescript
POST /api/v1/p2p/chat
{
  "tradeId": "trade-uuid",
  "recipientId": "user-uuid",
  "message": "Payment sent! Transaction ID: 123456"
}
```

### Open Dispute
```typescript
POST /api/v1/p2p/disputes
{
  "tradeId": "trade-uuid",
  "reason": "payment_not_received",
  "description": "I sent the payment but seller hasn't released funds",
  "evidence": [
    { "type": "payment_proof", "url": "..." },
    { "type": "screenshot", "url": "..." }
  ]
}
```

## WebSocket Integration

For real-time chat and notifications, use WebSocket:

```typescript
// Connect to trade chat
ws://localhost:3000/p2p/chat/:tradeId

// Events
{
  "type": "message",
  "data": {
    "id": "msg-uuid",
    "senderId": "user-uuid",
    "message": "Hello",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

## Security

- ✅ Multi-tenant isolation
- ✅ User authentication required
- ✅ Escrow protection
- ✅ Dispute arbitration
- ✅ Payment method verification
- ✅ Audit logging

## Testing

Run tests:
```bash
bun test src/modules/p2p-marketplace/__tests__
```

## License

Proprietary - BotCriptoFy2
