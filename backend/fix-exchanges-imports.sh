#!/bin/bash

# Script to fix all exchanges module imports
# Module not yet implemented - commenting out imports

echo "Fixing exchanges imports..."

# Fix 1: market-data-websocket-manager.ts
echo "1. Fixing market-data-websocket-manager.ts..."
sed -i.bak \
  -e "s|import { createWebSocketAdapter } from '@/modules/exchanges';|// Module not yet implemented\n// import { createWebSocketAdapter } from '@/modules/exchanges';|" \
  -e "s|import type { ConnectionConfig, ExchangeId } from '@/modules/exchanges';|// Module not yet implemented\n// import type { ConnectionConfig, ExchangeId } from '@/modules/exchanges';|" \
  -e "s|import type { IExchangeAdapter, SubscriptionRequest, ConnectionStatus, OrderBook, Trade, Ticker, Candle, ExchangeEventName, ExchangeEventListener, ConnectionMetrics } from './types';|import type { IExchangeAdapter, SubscriptionRequest, ConnectionStatus, OrderBook, Trade, Ticker, Candle, ExchangeEventName, ExchangeEventListener, ConnectionMetrics, ConnectionConfig, ExchangeId } from './types';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/market-data-websocket-manager.ts

# Fix 2: pipeline.ts
echo "2. Fixing pipeline.ts..."
sed -i.bak \
  -e "s|import { getDefaultWebSocketConfig } from '@/modules/exchanges';|// Module not yet implemented\n// import { getDefaultWebSocketConfig } from '@/modules/exchanges';\n\n// Temporary stub until exchanges module is implemented\nfunction getDefaultWebSocketConfig(exchangeId: ExchangeId): ConnectionConfig {\n  throw new Error(\`Exchanges module not yet implemented. Cannot get config for \${exchangeId}\`);\n}|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/pipeline.ts

# Fix 3: websocket-manager.ts
echo "3. Fixing websocket-manager.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/websocket-manager.ts

# Fix 4: orderbook.service.ts
echo "4. Fixing orderbook.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/orderbook.service.ts

# Fix 5: ohlcv.service.ts
echo "5. Fixing ohlcv.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/ohlcv.service.ts

# Fix 6: trades.service.ts
echo "6. Fixing trades.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/trades.service.ts

# Fix 7: ticker.service.ts
echo "7. Fixing ticker.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/ticker.service.ts

# Fix 8: order-book-snapshot.service.ts
echo "8. Fixing order-book-snapshot.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/order-book/services/order-book-snapshot.service.ts

# Fix 9: copy-trading.service.ts
echo "9. Fixing copy-trading.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/social-trading/services/copy-trading.service.ts

# Fix 10: position.service.ts
echo "10. Fixing position.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  -e "s|import { exchangeConnections } from '../../exchanges/schema/exchanges.schema';|// Module not yet implemented\n// import { exchangeConnections } from '../../exchanges/schema/exchanges.schema';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/orders/services/position.service.ts

# Fix 11: order.service.ts
echo "11. Fixing order.service.ts..."
sed -i.bak \
  -e "s|import { ExchangeService } from '../../exchanges/services/exchange.service';|// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';|" \
  /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/orders/services/order.service.ts

echo "Done! Backup files created with .bak extension"
echo "Now checking if server starts..."
