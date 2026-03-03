import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

export async function checkRateLimit() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { success } = await ratelimit.limit(userId);
  if (!success) return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  return null; // null = allowed
}
