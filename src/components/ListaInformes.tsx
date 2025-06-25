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
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
          Filtros de Búsqueda
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Año
            </label>
            <select
              value={filtros.año}
              onChange={(e) => setFiltros({ ...filtros, año: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Mes
            </label>
            <select
              value={filtros.mes}
              onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los meses</option>
              {meses.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Rol
            </label>
            <select
              value={filtros.rol}
              onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Grupo
            </label>
            <select
              value={filtros.grupo}
              onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los grupos</option>
              {grupos.map((grupo) => (
                <option key={grupo.id_grupo} value={grupo.id_grupo}>
                  {grupo.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Informes List */}
      <div className="space-y-4">
        {informes.map((informe) => (
          <div
            key={informe.id_informe}
            className="bg-white rounded-lg border border-gray-100 p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {informe.nombre.charAt(0)}{informe.apellido.charAt(0)}
                  </span>
                </div>
                
                {/* User Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                    {informe.nombre} {informe.apellido}
                  </h3>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Grupo: {informe.nombre_grupo || 'Sin grupo asignado'}
                  </p>
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Registrado: {new Date(informe.fecha_registro).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Status Badges */}
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
                  {informe.mes} {informe.año}
                </span>
                {informe.participacion && (
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
                    Participó
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{informe.horas}</div>
                <div className="text-sm text-gray-600 font-medium">Horas</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{informe.cursos}</div>
                <div className="text-sm text-gray-600 font-medium">Cursos</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {informe.participacion ? 'Sí' : 'No'}
                </div>
                <div className="text-sm text-gray-600 font-medium">Participación</div>
              </div>
            </div>

            {/* Roles */}
            {informe.roles && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Roles:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {informe.roles.split(',').map((rol, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {rol.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {informes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay informes</h3>
          <p className="text-gray-600">No se encontraron informes con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
} 