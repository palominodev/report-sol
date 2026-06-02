import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStatsUseCase } from '@/infrastructure/config/di';

const MESES_VALIDOS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const añoParam = searchParams.get('año');
    const mes = searchParams.get('mes');
    const rol = searchParams.get('rol');
    const grupoParam = searchParams.get('grupo');

    // Validate año (required)
    if (!añoParam || añoParam.trim() === '') {
      return NextResponse.json(
        { error: 'El parámetro "año" es obligatorio.' },
        { status: 400 }
      );
    }

    const año = Number(añoParam);
    if (isNaN(año) || año < 1900 || año > 2100) {
      return NextResponse.json(
        { error: 'El parámetro "año" debe ser un número válido entre 1900 y 2100.' },
        { status: 400 }
      );
    }

    // Validate mes (optional but must be valid if provided)
    if (mes !== null && mes !== '' && !MESES_VALIDOS.includes(mes)) {
      return NextResponse.json(
        { error: `El parámetro "mes" debe ser uno de: ${MESES_VALIDOS.join(', ')}.` },
        { status: 400 }
      );
    }

    // Parse grupo (optional)
    let grupo: number | undefined;
    if (grupoParam !== null && grupoParam !== '') {
      const parsed = Number(grupoParam);
      if (isNaN(parsed)) {
        return NextResponse.json(
          { error: 'El parámetro "grupo" debe ser un número válido.' },
          { status: 400 }
        );
      }
      grupo = parsed;
    }

    const useCase = getDashboardStatsUseCase();
    const stats = await useCase.execute({
      año,
      mes: mes || undefined,
      rol: rol || undefined,
      grupo,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
