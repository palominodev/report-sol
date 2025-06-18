'use client';

import { useState } from 'react';
import { createClient } from '@libsql/client';
import FormularioInforme from './FormularioInforme';

interface Integrante {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol_en_grupo: string;
  roles: string | null;
}

interface ListaIntegrantesProps {
  integrantes: Integrante[];
  nombreGrupo: string;
}

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

const rolEnGrupoColors: Record<string, string> = {
  'encargado': 'bg-red-100 text-red-800',
  'auxiliar': 'bg-yellow-100 text-yellow-800',
  'miembro': 'bg-green-100 text-green-800'
};

const rolColors: Record<string, string> = {
  'anciano': 'bg-purple-100 text-purple-800',
  'siervo': 'bg-indigo-100 text-indigo-800',
  'coordinador': 'bg-pink-100 text-pink-800',
  'secretario': 'bg-orange-100 text-orange-800',
  'publicador': 'bg-teal-100 text-teal-800',
  'auxiliar': 'bg-yellow-100 text-yellow-800',
  'regular': 'bg-blue-100 text-blue-800'
};

const getRolEnGrupoColor = (rol: string): string => {
  return rolEnGrupoColors[rol] || 'bg-gray-100 text-gray-800';
};

const getRolColor = (rol: string): string => {
  const rolNormalizado = rol.trim().toLowerCase();
  return rolColors[rolNormalizado] || 'bg-gray-100 text-gray-800';
};

export default function ListaIntegrantes({ integrantes, nombreGrupo }: ListaIntegrantesProps) {
  const [selectedIntegrante, setSelectedIntegrante] = useState<Integrante | null>(null);

  const handleSubmitInforme = async (data: any) => {
    const client = createClient({ url, authToken: token });
    await client.execute({
      sql: `
        INSERT INTO informe (horas, cursos, año, mes, participacion, id_usuario)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [data.horas, data.cursos, data.año, data.mes, data.participacion, selectedIntegrante?.id_usuario]
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Integrantes del {nombreGrupo}</h1>
      <ul className="space-y-3">
        {integrantes.map((integrante) => (
          <li 
            key={integrante.id_usuario}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedIntegrante(integrante)}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{integrante.nombre} {integrante.apellido}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${getRolEnGrupoColor(integrante.rol_en_grupo)}`}>
                  {integrante.rol_en_grupo}
                </span>
                {integrante.roles ? (
                  integrante.roles.split(',').map((rol, index) => (
                    <span key={index} className={`px-3 py-1 rounded-full text-sm ${getRolColor(rol)}`}>
                      {rol.trim()}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    Sin roles
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {selectedIntegrante && (
        <FormularioInforme
          id_usuario={selectedIntegrante.id_usuario}
          nombre={selectedIntegrante.nombre}
          apellido={selectedIntegrante.apellido}
          roles={selectedIntegrante.roles ? selectedIntegrante.roles.split(',') : []}
          onClose={() => setSelectedIntegrante(null)}
          onSubmit={handleSubmitInforme}
        />
      )}
    </div>
  );
} 