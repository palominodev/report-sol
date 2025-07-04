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
      <h1 className="text-2xl font-bold text-[#333333] mb-4" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>Estadísticas de los informes</h1>
      <div className="flex gap-6 mt-4 mb-6">
        <div className="bg-[#E8F4FD] rounded-[12px] p-4 text-center shadow-sm" style={{ minWidth: '160px' }}>
          <div className="text-2xl font-bold text-[#4A90E2]" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
            {informes.reduce((acc, curr) => acc + (curr.horas || 0), 0)}
          </div>
          <div className="text-sm font-semibold text-[#666666] mt-1" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
            Total de Horas
          </div>
        </div>
        <div className="bg-[#E8F5E8] rounded-[12px] p-4 text-center shadow-sm" style={{ minWidth: '160px' }}>
          <div className="text-2xl font-bold text-[#4CAF50]" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
            {informes.reduce((acc, curr) => acc + (curr.cursos || 0), 0)}
          </div>
          <div className="text-sm font-semibold text-[#666666] mt-1" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
            Total de Cursos
          </div>
        </div>
      </div>
    </div>
  );
} 