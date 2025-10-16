#!/bin/bash

# Fix quota.service.ts
sed -i '' 's/period: quota\.quotaPeriod,//' src/modules/subscriptions/services/quota.service.ts
sed -i '' 's/resetTime: quota\.nextResetAt,/allowed: currentUsage < limit,\
        isSoftLimitReached: quota.softLimitReached,\
        resetAt: quota.nextResetAt,/' src/modules/subscriptions/services/quota.service.ts
sed -i '' 's/isNearLimit:.*//' src/modules/subscriptions/services/quota.service.ts

echo "Fixes applied!"
