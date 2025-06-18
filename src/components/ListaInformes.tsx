'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@libsql/client';

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
}

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

export default function ListaInformes() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInformes = async () => {
      const client = createClient({ url, authToken: token });
      const result = await client.execute({
        sql: `
          SELECT 
            i.*,
            u.nombre,
            u.apellido
          FROM informe i
          JOIN usuario u ON i.id_usuario = u.id_usuario
          ORDER BY i.fecha_registro DESC
          LIMIT 100
        `
      });

      setInformes(result.rows.map(row => ({
        id_informe: row.id_informe as number,
        fecha_registro: row.fecha_registro as string,
        horas: row.horas as number,
        cursos: row.cursos as number,
        año: row.año as number,
        mes: row.mes as string,
        participacion: Boolean(row.participacion),
        nombre: row.nombre as string,
        apellido: row.apellido as string
      })));
      setLoading(false);
    };

    fetchInformes();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Últimos Informes</h2>
      <div className="space-y-4">
        {informes.map((informe) => (
          <div
            key={informe.id_informe}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {informe.nombre} {informe.apellido}
                </h3>
                <p className="text-sm text-gray-500">
                  Fecha de registro: {new Date(informe.fecha_registro).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {informe.mes} {informe.año}
                </span>
                {informe.participacion && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Participó
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Horas:</span>
                <span className="ml-2 font-medium">{informe.horas}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Cursos:</span>
                <span className="ml-2 font-medium">{informe.cursos}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 