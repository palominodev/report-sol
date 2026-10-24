import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/server';

/**
 * Tells the caller who the current session belongs to. The login screen calls it right after a
 * successful login to confirm the browser really kept the session cookie.
 */
export const GET = withAuth(async (_request, _context, account) =>
  NextResponse.json({ account }, { headers: { 'Cache-Control': 'no-store' } })
);
