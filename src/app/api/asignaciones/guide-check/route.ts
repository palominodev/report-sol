import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/server';
import { checkGuideUpdate } from '@/infrastructure/scraper/sync-service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';
    const status = await checkGuideUpdate({ force });
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error al verificar actualización de guía:', error);
    const message = error instanceof Error ? error.message : 'Error al verificar guía';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
