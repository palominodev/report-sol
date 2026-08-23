'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PREACHING_ROLES, APPOINTMENT_ROLES, PreachingRole, AppointmentRole, GENERO_VALUES } from '@/domain/entities/User';

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
  genero?: string | null;
}

interface FormularioUsuarioProps {
  grupos: Grupo[];
  usuarioInicial?: Usuario;
  titulo: string;
  textoBoton: string;
  esEdicion?: boolean;
}

const rolesEnGrupo = ['miembro', 'auxiliar', 'encargado'] as const;

const preachingRoleLabels: Record<PreachingRole, string> = {
  publicador: 'Publicador',
  auxiliar: 'Precursor Auxiliar',
  regular: 'Precursor Regular',
};

const appointmentRoleLabels: Record<AppointmentRole, string> = {
  anciano: 'Anciano',
  siervo: 'Siervo Ministerial',
  secretario: 'Secretario',
  coordinador: 'Coordinador',
};

export default function FormularioUsuario({
  grupos,
  usuarioInicial,
  titulo,
  textoBoton,
  esEdicion = false,
}: FormularioUsuarioProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuarioInicial?.nombre || '');
  const [apellido, setApellido] = useState(usuarioInicial?.apellido || '');
  const [idGrupo, setIdGrupo] = useState(usuarioInicial?.id_grupo || '');

  // Separated states for Preaching (single) and Appointments (multiple)
  const [rolPredicacion, setRolPredicacion] = useState<PreachingRole>('publicador');
  const [nombramientos, setNombramientos] = useState<AppointmentRole[]>([]);
  const [rolEnGrupo, setRolEnGrupo] = useState(usuarioInicial?.rol_en_grupo || 'miembro');
  const [genero, setGenero] = useState(usuarioInicial?.genero || '');

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (usuarioInicial) {
      setNombre(usuarioInicial.nombre);
      setApellido(usuarioInicial.apellido);
      setIdGrupo(usuarioInicial.id_grupo);
      setRolEnGrupo(usuarioInicial.rol_en_grupo || 'miembro');
      setGenero(usuarioInicial.genero || '');

      // Distribute initial roles into preaching vs appointments
      const rawRoles = usuarioInicial.roles || [];
      const foundPreaching = rawRoles.find((r) =>
        (PREACHING_ROLES as readonly string[]).includes(r)
      ) as PreachingRole | undefined;

      setRolPredicacion(foundPreaching || 'publicador');

      const foundAppointments = rawRoles.filter((r) =>
        (APPOINTMENT_ROLES as readonly string[]).includes(r)
      ) as AppointmentRole[];

      setNombramientos(foundAppointments);
    }
  }, [usuarioInicial]);

  const toggleNombramiento = (rol: AppointmentRole) => {
    setNombramientos((prev) => {
      if (prev.includes(rol)) {
        return prev.filter((r) => r !== rol);
      } else {
        // Enforce exclusivity between anciano and siervo
        if (rol === 'anciano') {
          return [...prev.filter((r) => r !== 'siervo'), 'anciano'];
        }
        if (rol === 'siervo') {
          return [...prev.filter((r) => r !== 'anciano'), 'siervo'];
        }
        return [...prev, rol];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    // --- FRONTEND VALIDATION ---
    const trimmedNombre = nombre.trim();
    const trimmedApellido = apellido.trim();

    if (!trimmedNombre || !trimmedApellido) {
      setError('El nombre y apellido son requeridos.');
      return;
    }

    if (!idGrupo || Number(idGrupo) <= 0) {
      setError('Debes seleccionar un grupo para el usuario.');
      return;
    }

    if (!rolPredicacion) {
      setError('Debes seleccionar un rol de predicación.');
      return;
    }

    if (nombramientos.includes('anciano') && nombramientos.includes('siervo')) {
      setError('Un usuario no puede ser "Anciano" y "Siervo Ministerial" a la vez.');
      return;
    }

    if (!esEdicion && !genero) {
      setError('El género es requerido para el nuevo publicador.');
      return;
    }

    if (genero && !(GENERO_VALUES as readonly string[]).includes(genero)) {
      setError('El género debe ser "masculino" o "femenino".');
      return;
    }

    // Combine preaching role + appointments
    const payloadRoles = [rolPredicacion, ...nombramientos];

    setIsSubmitting(true);

    try {
      const url = esEdicion ? `/api/usuario/${usuarioInicial?.id_usuario}` : '/api/usuario';

      const res = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuarioInicial?.id_usuario,
          nombre: trimmedNombre,
          apellido: trimmedApellido,
          id_grupo: Number(idGrupo),
          roles: payloadRoles,
          rol_en_grupo: rolEnGrupo,
          genero: genero || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || (esEdicion ? 'Error al actualizar usuario' : 'Error al crear usuario'));
      }

      if (!esEdicion) {
        setNombre('');
        setApellido('');
        setIdGrupo('');
        setRolPredicacion('publicador');
        setNombramientos([]);
        setRolEnGrupo('miembro');
        setGenero('');
      }

      setMensaje(esEdicion ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');

      setTimeout(() => {
        router.push('/dashboard/publicadores');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1 text-balance">
                {titulo}
              </h1>
              <p className="text-gray-600 text-lg">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-balance">
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ingresa el nombre"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Ingresa el apellido"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Género {!esEdicion && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      esEdicion && !usuarioInicial?.genero ? 'border-amber-300 bg-amber-50' : ''
                    } ${esEdicion ? 'cursor-pointer' : ''}`}
                    value={genero}
                    onChange={(e) => setGenero(e.target.value)}
                    required={!esEdicion}
                  >
                    <option value="">{esEdicion ? 'Sin especificar' : 'Selecciona el género'}</option>
                    {GENERO_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </option>
                    ))}
                  </select>
                  {esEdicion && !usuarioInicial?.genero && (
                    <p className="mt-1 text-xs text-amber-700">
                      Género pendiente de definir. Completa este campo para que el publicador pueda ser asignado.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Group Assignment Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-balance">
                Asignación de Grupo
              </h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Grupo <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={idGrupo}
                  onChange={(e) => setIdGrupo(e.target.value)}
                  required
                >
                  <option value="">Selecciona un grupo</option>
                  {grupos.map((grupo) => (
                    <option key={grupo.id_grupo} value={grupo.id_grupo}>
                      {grupo.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Roles Section */}
            <div className="space-y-6 pt-2 border-t border-gray-100">
              {/* 1. Preaching Role (Mutually Exclusive) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Rol de Predicación <span className="text-red-500">*</span>
                  </h3>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Excluyente (Solo 1)
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Selecciona la categoría de predicación principal del usuario.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PREACHING_ROLES.map((rol) => (
                    <label
                      key={rol}
                      className={`flex items-center p-3.5 border rounded-lg cursor-pointer transition-all ${
                        rolPredicacion === rol
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rolPredicacion"
                        value={rol}
                        checked={rolPredicacion === rol}
                        onChange={() => setRolPredicacion(rol)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 transition-colors"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {preachingRoleLabels[rol]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Congregational Appointments / Responsibilities (Checkboxes) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Nombramientos / Responsabilidades
                  </h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Opcionales
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Asigna nombramientos adicionales si corresponden.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {APPOINTMENT_ROLES.map((rol) => {
                    const isChecked = nombramientos.includes(rol);
                    const isDisabled =
                      (rol === 'anciano' && nombramientos.includes('siervo')) ||
                      (rol === 'siervo' && nombramientos.includes('anciano'));

                    return (
                      <label
                        key={rol}
                        className={`flex flex-col p-3 border rounded-lg transition-all ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                            : isChecked
                            ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400 cursor-pointer'
                            : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => toggleNombramiento(rol)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                          />
                          <span className="ml-2.5 text-sm font-medium text-gray-900">
                            {appointmentRoleLabels[rol]}
                          </span>
                        </div>
                        {isDisabled && (
                          <span className="text-[11px] text-gray-400 mt-1 pl-6">
                            Incompatible
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Role in Group */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Rol en el Grupo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {rolesEnGrupo.map((rol) => (
                    <label
                      key={rol}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                        rolEnGrupo === rol
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rolEnGrupo"
                        value={rol}
                        checked={rolEnGrupo === rol}
                        onChange={() => setRolEnGrupo(rol)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 transition-colors"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 capitalize">
                        {rol}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Error & Success Messages */}
            {mensaje && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg aria-hidden="true" className="w-5 h-5 text-green-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">{mensaje}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg aria-hidden="true" className="w-5 h-5 text-red-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {textoBoton}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}