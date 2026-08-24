import { NextRequest, NextResponse } from 'next/server';
import { syncMeetingWorkbook } from '@/infrastructure/scraper/sync-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let issue: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.issue === 'string' && body.issue.trim().length > 0) {
        issue = body.issue.trim();
      }
    } catch {
      // Body is empty or not JSON, default to latest
    }

    const result = await syncMeetingWorkbook({ issue });
    return NextResponse.json({
      success: true,
      issue: result.issue,
      weeksLoaded: result.weeksLoaded,
      partsLoaded: result.partsLoaded,
    });
  } catch (error) {
    console.error('Error al sincronizar guía de actividades:', error);
    const message = error instanceof Error ? error.message : 'Error al sincronizar la guía';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
