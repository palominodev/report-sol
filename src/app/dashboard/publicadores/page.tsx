'use client'
import { useState, useEffect } from 'react';
import { createClient } from '@libsql/client';
import Filtro from './Filtro';
import MenuAcciones from './MenuAcciones';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

async function getGrupos() {
  const client = createClient({ url, authToken: token });
  const result = await client.execute('SELECT id_grupo, nombre FROM grupo');
  return result.rows;
}

async function getPublicadores(grupoId?: number) {
  const client = createClient({ url, authToken: token });
  const query = `
    SELECT 
      u.id_usuario, 
      u.nombre, 
      u.apellido, 
      GROUP_CONCAT(r.rol) as roles,
      g.nombre as grupo
    FROM usuario u
    LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    LEFT JOIN rol r ON ur.id_rol = r.id_rol
    LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
    LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
    ${grupoId ? 'WHERE g.id_grupo = ?' : ''}
    GROUP BY u.id_usuario, u.nombre, u.apellido, g.nombre
  `;
  const result = await client.execute({
    sql: query,
    args: grupoId ? [grupoId] : [],
  });
  return result.rows;
}

export default function Publicadores() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [publicadores, setPublicadores] = useState<any[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | undefined>(undefined);

  useEffect(() => {
    getGrupos().then(setGrupos);
  }, []);

  useEffect(() => {
    getPublicadores(grupoSeleccionado).then(setPublicadores);
  }, [grupoSeleccionado]);

  const handleEliminar = async (idUsuario: number) => {
    // TODO: Implementar lógica de eliminación
    console.log('Eliminar usuario:', idUsuario);
  };

  const handleMoverGrupo = async (idUsuario: number) => {
    // TODO: Implementar lógica para mover a otro grupo
    console.log('Mover usuario:', idUsuario);
  };

  const handleActualizar = async (idUsuario: number) => {
    // TODO: Implementar lógica de actualización
    console.log('Actualizar usuario:', idUsuario);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lista de Publicadores</h1>
      <Filtro
        grupos={grupos}
        grupoSeleccionado={grupoSeleccionado}
        onGrupoChange={setGrupoSeleccionado}
      />
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">Nombre</th>
              <th className="px-4 py-2 border-b">Apellido</th>
              <th className="px-4 py-2 border-b">Roles</th>
              <th className="px-4 py-2 border-b">Grupo</th>
              <th className="px-4 py-2 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {publicadores.map((pub: any) => (
              <tr key={pub.id_usuario}>
                <td className="px-4 py-2 border-b">{pub.nombre}</td>
                <td className="px-4 py-2 border-b">{pub.apellido}</td>
                <td className="px-4 py-2 border-b">{pub.roles}</td>
                <td className="px-4 py-2 border-b">{pub.grupo}</td>
                <td className="px-4 py-2 border-b">
                  <MenuAcciones
                    idUsuario={pub.id_usuario}
                    onEliminar={handleEliminar}
                    onMoverGrupo={handleMoverGrupo}
                    onActualizar={handleActualizar}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 