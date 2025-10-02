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
      }, 1000);
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                {titulo}
              </h1>
              <p className="text-gray-600 text-lg" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                {esEdicion ? 'Modifica la información del publicador' : 'Registra un nuevo publicador en el sistema'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Nombre
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ingresa el nombre"
                    required
                    style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Apellido
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={apellido}
                    onChange={e => setApellido(e.target.value)}
                    placeholder="Ingresa el apellido"
                    required
                    style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            {/* Group Assignment Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                Asignación de Grupo
              </h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Grupo
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={idGrupo}
                  onChange={e => setIdGrupo(e.target.value)}
                  required
                  style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
                >
                  <option value="">Selecciona un grupo</option>
                  {grupos.map(grupo => (
                    <option key={grupo.id_grupo} value={grupo.id_grupo}>
                      {grupo.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Roles Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                Roles y Responsabilidades
              </h3>
              
              {/* Roles Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Roles Asignados
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {roles.map(rol => (
                    <label key={rol} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={rolesSeleccionados.includes(rol)}
                        onChange={() => toggleRol(rol)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 capitalize" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                        {rol}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Role in Group */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Rol en el Grupo
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {rolesEnGrupo.map(rol => (
                    <label key={rol} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="rolEnGrupo"
                        checked={rolEnGrupo === rol}
                        onChange={() => setRolEnGrupo(rol)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 transition-colors"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 capitalize" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                        {rol}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            {mensaje && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-800" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    {mensaje}
                  </p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-red-800" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {textoBoton}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 