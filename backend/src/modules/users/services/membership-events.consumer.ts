import { onMembershipEvent } from '../../tenants/events/membership-event-bus';
import { UsersProfileService } from './user-profile-cache.service';
import { UsersTenantsCacheService } from './user-tenants-cache.service';

let initialized = false;

export function initializeMembershipEventsConsumer() {
  if (initialized) return;
  initialized = true;
  onMembershipEvent(async (evt) => {
    try {
      await UsersProfileService.invalidateProfile(evt.userId);
      await UsersTenantsCacheService.invalidateTenants(evt.userId);
    } catch {
      // best-effort invalidation
    }
  });
}

