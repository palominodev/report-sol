import React from 'react';

interface Informe {
  id_informe: number;
  fecha_registro: string;
  horas: number;
  cursos: number;
  año: number;
  mes: string;
  participacion: boolean;
  nombre: string;
  apellido: string;
  roles: string;
  nombre_grupo: string;
}

export default function EstadisticasInformes({ informes }: { informes: Informe[] }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-4 text-balance">Estadísticas de los informes</h1>
      <div className="flex gap-6 mt-4 mb-6">
        <div className="bg-surface border border-line p-4 text-center" style={{ minWidth: '160px' }}>
          <div className="text-2xl font-bold text-brand-light">
            {informes.reduce((acc, curr) => acc + (curr.horas || 0), 0)}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Total de Horas
          </div>
        </div>
        <div className="bg-surface border border-line p-4 text-center" style={{ minWidth: '160px' }}>
          <div className="text-2xl font-bold text-brand-light">
            {informes.reduce((acc, curr) => acc + (curr.cursos || 0), 0)}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Total de Cursos
          </div>
        </div>
      </div>
    </div>
  );
} 