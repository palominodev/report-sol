'use client'
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

interface Grupo {
  id_grupo: number;
  nombre: string;
}

interface Usuario {
  id_usuario?: number;
  nombre: string;
  apellido: string;
  id_grupo: string;
  roles: string[];
  rol_en_grupo: string;
}

interface FormularioUsuarioProps {
  grupos: Grupo[];
  usuarioInicial?: Usuario;
  titulo: string;
  textoBoton: string;
  esEdicion?: boolean;
}

const roles = ['publicador', 'auxiliar', 'regular', 'siervo', 'anciano', 'secretario', 'coordinador'];
const rolesEnGrupo = ['miembro', 'auxiliar', 'encargado'];

export default function FormularioUsuario({ 
  grupos, 
  usuarioInicial, 
  titulo, 
  textoBoton,
  esEdicion = false
}: FormularioUsuarioProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuarioInicial?.nombre || "");
  const [apellido, setApellido] = useState(usuarioInicial?.apellido || "");
  const [idGrupo, setIdGrupo] = useState(usuarioInicial?.id_grupo || "");
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(usuarioInicial?.roles || []);
  const [rolEnGrupo, setRolEnGrupo] = useState(usuarioInicial?.rol_en_grupo || "miembro");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (usuarioInicial) {
      setNombre(usuarioInicial.nombre);
      setApellido(usuarioInicial.apellido);
      setIdGrupo(usuarioInicial.id_grupo);
      setRolesSeleccionados(usuarioInicial.roles);
      setRolEnGrupo(usuarioInicial.rol_en_grupo);
    }
  }, [usuarioInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    try {
      const url = esEdicion 
        ? `/api/usuario/${usuarioInicial?.id_usuario}`
        : '/api/usuario';
      
      const res = await fetch(url, {
        method: esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: usuarioInicial?.id_usuario,
          nombre,
          apellido,
          id_grupo: idGrupo,
          roles: rolesSeleccionados,
          rol_en_grupo: rolEnGrupo
        }),
      });

      if (!res.ok) {
        throw new Error(esEdicion ? "Error al actualizar usuario" : "Error al crear usuario");
      }

      if (!esEdicion) {
        // Solo limpiar el formulario si es un nuevo usuario
        setNombre("");
        setApellido("");
        setIdGrupo("");
        setRolesSeleccionados([]);
        setRolEnGrupo("miembro");
      }
      
      setMensaje(esEdicion ? "Usuario actualizado exitosamente" : "Usuario creado exitosamente");
      
      // Redirigir después de un breve delay para mostrar el mensaje
      setTimeout(() => {
        router.push('/dashboard/publicadores');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud");
    }
  };

  const toggleRol = (rol: string) => {
    setRolesSeleccionados(prev => 
      prev.includes(rol) ? prev.filter(r => r !== rol) : [...prev, rol]
    );
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-8 border border-gray-200 rounded-lg shadow-sm bg-white">
        <h1 className="text-2xl font-semibold mb-6 text-center">{titulo}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Nombre</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Apellido</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={apellido}
              onChange={e => setApellido(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Grupo</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={idGrupo}
              onChange={e => setIdGrupo(e.target.value)}
              required
            >
              <option value="">Seleccione un grupo</option>
              {grupos.map(grupo => (
                <option key={grupo.id_grupo} value={grupo.id_grupo}>
                  {grupo.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(rol => (
                <label key={rol} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={rolesSeleccionados.includes(rol)}
                    onChange={() => toggleRol(rol)}
                  />
                  {rol}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Rol en Grupo</label>
            <div className="flex flex-wrap gap-2">
              {rolesEnGrupo.map(rol => (
                <label key={rol} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="rolEnGrupo"
                    checked={rolEnGrupo === rol}
                    onChange={() => setRolEnGrupo(rol)}
                  />
                  {rol}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
          >
            {textoBoton}
          </button>
        </form>
        {mensaje && <p className="mt-4 text-center text-sm text-green-600">{mensaje}</p>}
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
} 