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
  roles: string;
  nombre_grupo: string;
}

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

const meses = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

const roles = [
  { id: 'publicador', label: 'Publicador' },
  { id: 'auxiliar', label: 'Auxiliar' },
  { id: 'regular', label: 'Regular' }
];

export default function ListaInformes() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    año: new Date().getFullYear(),
    mes: meses[new Date().getMonth()],
    rol: '',
    grupo: ''
  });
  const [grupos, setGrupos] = useState<{ id_grupo: number; nombre: string }[]>([]);

  useEffect(() => {
    const fetchGrupos = async () => {
      const client = createClient({ url, authToken: token });
      const result = await client.execute('SELECT id_grupo, nombre FROM grupo');
      setGrupos(result.rows.map(row => ({
        id_grupo: row.id_grupo as number,
        nombre: row.nombre as string
      })));
    };

    fetchGrupos();
  }, []);

  useEffect(() => {
    const fetchInformes = async () => {
      setLoading(true);
      const client = createClient({ url, authToken: token });
      
      let sql = `
        SELECT 
          i.*,
          u.nombre,
          u.apellido,
          GROUP_CONCAT(r.rol) as roles,
          g.nombre as nombre_grupo
        FROM informe i
        JOIN usuario u ON i.id_usuario = u.id_usuario
        LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN rol r ON ur.id_rol = r.id_rol
        LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
        LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
        WHERE 1=1
      `;
      
      const args: any[] = [];

      if (filtros.año) {
        sql += ' AND i.año = ?';
        args.push(filtros.año);
      }

      if (filtros.mes) {
        sql += ' AND i.mes = ?';
        args.push(filtros.mes);
      }

      if (filtros.grupo) {
        sql += ' AND g.id_grupo = ?';
        args.push(filtros.grupo);
      }

      sql += ' GROUP BY i.id_informe, u.nombre, u.apellido, g.nombre';
      
      if (filtros.rol) {
        sql += ' HAVING roles LIKE ?';
        args.push(`%${filtros.rol}%`);
      }

      sql += ' ORDER BY i.fecha_registro DESC LIMIT 100';

      const result = await client.execute({ sql, args });

      setInformes(result.rows.map(row => ({
        id_informe: row.id_informe as number,
        fecha_registro: row.fecha_registro as string,
        horas: row.horas as number,
        cursos: row.cursos as number,
        año: row.año as number,
        mes: row.mes as string,
        participacion: Boolean(row.participacion),
        nombre: row.nombre as string,
        apellido: row.apellido as string,
        roles: row.roles as string,
        nombre_grupo: row.nombre_grupo as string
      })));
      setLoading(false);
    };

    fetchInformes();
  }, [filtros]);

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
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Año
          </label>
          <select
            value={filtros.año}
            onChange={(e) => setFiltros({ ...filtros, año: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[...Array(5)].map((_, i) => {
              const año = new Date().getFullYear() - i;
              return (
                <option key={año} value={año}>
                  {año}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mes
          </label>
          <select
            value={filtros.mes}
            onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {meses.map((mes) => (
              <option key={mes} value={mes}>
                {mes}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol
          </label>
          <select
            value={filtros.rol}
            onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grupo
          </label>
          <select
            value={filtros.grupo}
            onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {grupos.map((grupo) => (
              <option key={grupo.id_grupo} value={grupo.id_grupo}>
                {grupo.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

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
                <p className="text-sm text-gray-500">
                  Grupo: {informe.nombre_grupo || 'Sin grupo'}
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
            {informe.roles && (
              <div className="mt-2">
                <span className="text-sm text-gray-500">Roles: </span>
                <span className="font-medium">{informe.roles}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 