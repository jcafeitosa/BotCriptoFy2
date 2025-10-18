import { EventEmitter } from 'events';
import Redis from 'ioredis';

export type MembershipEventType = 'added' | 'updated' | 'removed';
export interface MembershipEvent {
  type: MembershipEventType;
  tenantId: string;
  userId: string;
  payload?: Record<string, unknown>;
}

const CHANNEL = 'tenants:membership';
const emitter = new EventEmitter();
let redisPub: Redis | null = null;
let redisSub: Redis | null = null;
let initialized = false;

export function onMembershipEvent(listener: (evt: MembershipEvent) => void) {
  emitter.on('membership', listener);
}

export async function publishMembershipEvent(evt: MembershipEvent) {
  // In-memory publish
  emitter.emit('membership', evt);
  // Optional Redis publish
  try {
    if (process.env.REDIS_URL) {
      if (!redisPub) redisPub = new Redis(process.env.REDIS_URL, { lazyConnect: true });
      if (redisPub.status === 'end' || redisPub.status === 'wait') await redisPub.connect();
      await redisPub.publish(CHANNEL, JSON.stringify(evt));
    }
  } catch {
    // Ignore Redis errors; in-memory delivery still works
  }
}

export async function initializeMembershipEventBus() {
  if (initialized) return;
  initialized = true;
  if (!process.env.REDIS_URL) return;
  try {
    redisSub = new Redis(process.env.REDIS_URL, { lazyConnect: true });
    if (redisSub.status === 'end' || redisSub.status === 'wait') await redisSub.connect();
    await redisSub.subscribe(CHANNEL);
    redisSub.on('message', (_channel, message) => {
      try {
        const evt = JSON.parse(message) as MembershipEvent;
        emitter.emit('membership', evt);
      } catch {
        // Ignore bad messages
      }
    });
  } catch {
    // Fallback silently to in-memory only
  }
}

