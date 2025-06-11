import { NextResponse } from 'next/server';
import { getGrupos } from '@/lib/getGrupos';

export async function GET() {
  try {
    const grupos = await getGrupos();
    return NextResponse.json(grupos);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 