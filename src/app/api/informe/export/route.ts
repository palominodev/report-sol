import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getInformeRepository } from '@/infrastructure/config/di';
import { GetInformesUseCase } from '@/core/application/use-cases/GetInformesUseCase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const año = searchParams.get('año');
    const mes = searchParams.get('mes');
    const rol = searchParams.get('rol');
    const grupo = searchParams.get('grupo');

    const repo = getInformeRepository();
    const getInformesUseCase = new GetInformesUseCase(repo);
    const informes = await getInformesUseCase.execute({
      año: año ? parseInt(año) : null,
      mes,
      rol,
      grupo: grupo ? parseInt(grupo) : null,
    });

    const data = informes.map((informe) => ({
      Nombre: informe.nombre || '',
      Apellido: informe.apellido || '',
      Grupo: informe.grupo_nombre || 'Sin grupo',
      Mes: informe.mes,
      Año: informe.año,
      Horas: informe.horas ?? 0,
      Cursos: informe.cursos,
      Participación: informe.participacion ? 'Sí' : 'No',
      'Trabajo como Auxiliar': informe.trabajo_como_auxiliar ? 'Sí' : 'No',
      'Fecha de Registro': new Date(informe.fecha_registro).toLocaleDateString('es-ES'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Informes');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const currentDate = new Date().toISOString().split('T')[0];
    const mesLabel = mes ? `_${mes}` : '';
    const filename = `informe_actividades_${año || ''}${mesLabel}_${currentDate}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error al exportar informe:', error);
    return NextResponse.json(
      { error: 'Error al generar el archivo Excel' },
      { status: 500 }
    );
  }
}
