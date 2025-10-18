#!/usr/bin/env python3
"""
Fix all imports referencing the non-existent exchanges module.
"""

import os
import re

FILES_TO_FIX = [
    # market-data module
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/market-data-websocket-manager.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/pipeline.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/websocket-manager.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/orderbook.service.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/ohlcv.service.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/trades.service.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/services/ticker.service.ts",
    # order-book module
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/order-book/services/order-book-snapshot.service.ts",
    # social-trading module
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/social-trading/services/copy-trading.service.ts",
    # orders module
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/orders/services/position.service.ts",
    "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/orders/services/order.service.ts",
]

def fix_file(filepath):
    """Fix exchanges imports in a single file."""
    print(f"Fixing {os.path.basename(filepath)}...")

    if not os.path.exists(filepath):
        print(f"  ⚠️  File not found: {filepath}")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern 1: import { ... } from '@/modules/exchanges';
    content = re.sub(
        r"import \{ ([^}]+) \} from '@/modules/exchanges';",
        r"// Module not yet implemented\n// import { \1 } from '@/modules/exchanges';",
        content
    )

    # Pattern 2: import type { ... } from '@/modules/exchanges';
    content = re.sub(
        r"import type \{ ([^}]+) \} from '@/modules/exchanges';",
        r"// Module not yet implemented\n// import type { \1 } from '@/modules/exchanges';",
        content
    )

    # Pattern 3: import { ExchangeService } from '../../exchanges/services/exchange.service';
    content = re.sub(
        r"import \{ ExchangeService \} from '\.\..*exchanges/services/exchange\.service';",
        r"// Module not yet implemented\n// import { ExchangeService } from '../../exchanges/services/exchange.service';",
        content
    )

    # Pattern 4: import { exchangeConnections } from '../../exchanges/schema/exchanges.schema';
    content = re.sub(
        r"import \{ exchangeConnections \} from '\.\..*exchanges/schema/exchanges\.schema';",
        r"// Module not yet implemented\n// import { exchangeConnections } from '../../exchanges/schema/exchanges.schema';",
        content
    )

    if content != original_content:
        # Create backup
        with open(filepath + '.bak', 'w', encoding='utf-8') as f:
            f.write(original_content)

        # Write fixed content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  ✅ Fixed and backed up to {os.path.basename(filepath)}.bak")
        return True
    else:
        print(f"  ℹ️  No changes needed")
        return False

def fix_special_cases():
    """Fix special cases that need more complex handling."""

    # Fix 1: market-data-websocket-manager.ts needs to import types from ./types
    filepath = "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/market-data-websocket-manager.ts"
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add ConnectionConfig and ExchangeId to the types import
        if "import type { IExchangeAdapter" in content and "ConnectionConfig, ExchangeId" not in content:
            content = content.replace(
                "import type { IExchangeAdapter, SubscriptionRequest, ConnectionStatus, OrderBook, Trade, Ticker, Candle, ExchangeEventName, ExchangeEventListener, ConnectionMetrics } from './types';",
                "import type { IExchangeAdapter, SubscriptionRequest, ConnectionStatus, OrderBook, Trade, Ticker, Candle, ExchangeEventName, ExchangeEventListener, ConnectionMetrics, ConnectionConfig, ExchangeId } from './types';"
            )

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Added ConnectionConfig and ExchangeId to {os.path.basename(filepath)} types import")

    # Fix 2: pipeline.ts needs a stub for getDefaultWebSocketConfig
    filepath = "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/pipeline.ts"
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add stub function after commenting out import
        if "// import { getDefaultWebSocketConfig } from '@/modules/exchanges';" in content and "function getDefaultWebSocketConfig" not in content:
            content = content.replace(
                "// import { getDefaultWebSocketConfig } from '@/modules/exchanges';",
                """// import { getDefaultWebSocketConfig } from '@/modules/exchanges';

// Temporary stub until exchanges module is implemented
function getDefaultWebSocketConfig(exchangeId: ExchangeId): ConnectionConfig {
  throw new Error(`Exchanges module not yet implemented. Cannot get config for ${exchangeId}`);
}"""
            )

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Added stub function to {os.path.basename(filepath)}")

    # Fix 3: Comment out createWebSocketAdapter usage in market-data-websocket-manager.ts
    filepath = "/Users/myminimac/Desenvolvimento/BotCriptoFy2/backend/src/modules/market-data/websocket/market-data-websocket-manager.ts"
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Comment out the createWebSocketAdapter call
        if "return createWebSocketAdapter(exchangeId, config);" in content:
            content = content.replace(
                "  private createAdapter(exchangeId: ExchangeId, config: ConnectionConfig): IExchangeAdapter {\n    // Delegate creation to exchanges module to centralize exchange connectivity\n    return createWebSocketAdapter(exchangeId, config);",
                "  private createAdapter(exchangeId: ExchangeId, config: ConnectionConfig): IExchangeAdapter {\n    // Delegate creation to exchanges module to centralize exchange connectivity\n    // Module not yet implemented\n    throw new Error(`Exchanges module not yet implemented. Cannot create adapter for ${exchangeId}`);\n    // return createWebSocketAdapter(exchangeId, config);"
            )

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Commented out createWebSocketAdapter usage in {os.path.basename(filepath)}")

def main():
    print("=" * 60)
    print("Fixing exchanges module imports")
    print("=" * 60)
    print()

    fixed_count = 0
    for filepath in FILES_TO_FIX:
        if fix_file(filepath):
            fixed_count += 1

    print()
    print("Fixing special cases...")
    fix_special_cases()

    print()
    print("=" * 60)
    print(f"✅ Fixed {fixed_count} files")
    print("Backup files created with .bak extension")
    print("=" * 60)

if __name__ == "__main__":
    main()
