#!/bin/bash

# Validate Module Implementation
# Counts files, services, routes for each module

echo "=== MODULE VALIDATION REPORT ==="
echo ""

modules=(audit auth ceo configurations departments documents financial marketing notifications rate-limiting sales security subscriptions support tenants users)

for module in "${modules[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "MODULE: $module"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    module_path="src/modules/$module"

    if [ ! -d "$module_path" ]; then
        echo "❌ NOT FOUND"
        echo ""
        continue
    fi

    # Count all TypeScript files
    total_files=$(find "$module_path" -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')

    # Count routes
    route_files=$(find "$module_path" -type f -name "*routes.ts" 2>/dev/null | wc -l | tr -d ' ')

    # Count services
    service_files=$(find "$module_path" -type f -name "*service.ts" 2>/dev/null | wc -l | tr -d ' ')

    # Count schemas
    schema_files=$(find "$module_path" -type f -name "*schema.ts" 2>/dev/null | wc -l | tr -d ' ')

    # Count tests
    test_files=$(find "$module_path" -type f -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')

    # Check for index.ts
    if [ -f "$module_path/index.ts" ]; then
        index_exists="✅ Yes"
        index_size=$(wc -l < "$module_path/index.ts" | tr -d ' ')
    else
        index_exists="❌ No"
        index_size=0
    fi

    echo "Total Files:    $total_files"
    echo "Routes:         $route_files"
    echo "Services:       $service_files"
    echo "Schemas:        $schema_files"
    echo "Tests:          $test_files"
    echo "index.ts:       $index_exists ($index_size lines)"

    # Determine status
    if [ "$total_files" -eq 0 ]; then
        status="🔴 EMPTY"
        completeness="0%"
    elif [ "$total_files" -eq 1 ] && [ "$index_size" -lt 20 ]; then
        status="🟡 STUB ONLY"
        completeness="5%"
    elif [ "$route_files" -eq 0 ] && [ "$service_files" -eq 0 ]; then
        status="🟡 PARTIAL (no routes/services)"
        completeness="20%"
    elif [ "$service_files" -gt 0 ] && [ "$route_files" -gt 0 ]; then
        status="✅ IMPLEMENTED"
        if [ "$test_files" -gt 0 ]; then
            completeness="80%"
        else
            completeness="60%"
        fi
    else
        status="🟡 PARTIAL"
        completeness="40%"
    fi

    echo ""
    echo "STATUS:         $status"
    echo "COMPLETENESS:   $completeness"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VALIDATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
