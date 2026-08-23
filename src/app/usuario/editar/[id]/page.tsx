import FormularioUsuario from '../../../components/FormularioUsuario';
import { notFound } from 'next/navigation';
import { getGruposSummary } from '@/lib/getGrupos';
import { getUsuarioDetails } from '@/lib/getUsuarioDetails';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [usuarioDetails, grupos] = await Promise.all([
    getUsuarioDetails(id),
    getGruposSummary(),
  ]);

  if (!usuarioDetails) {
    notFound();
  }

  const usuario = {
    id_usuario: usuarioDetails.id_usuario,
    nombre: usuarioDetails.nombre,
    apellido: usuarioDetails.apellido,
    id_grupo: usuarioDetails.id_grupo?.toString() || '',
    roles: usuarioDetails.roles ? usuarioDetails.roles.split(',') : [],
    rol_en_grupo: usuarioDetails.rol_en_grupo || 'miembro',
    genero: usuarioDetails.genero,
  };

  return (
    <div>
      {usuarioDetails.genero == null && (
        <div
          role="alert"
          className="mx-auto max-w-2xl mt-6 px-6 rounded-lg border border-amber-200 bg-amber-50 py-4"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-amber-800">
                Género pendiente de definir
              </h2>
              <p className="mt-1 text-sm text-amber-700">
                Este publicador aún no tiene un género definido, por lo que no puede participar en las
                asignaciones de la reunión. Completa el campo <strong>Género</strong> para habilitarlo.
              </p>
            </div>
          </div>
        </div>
      )}
      <FormularioUsuario
        grupos={grupos}
        usuarioInicial={usuario}
        titulo={`Editar Usuario ${usuario.nombre} ${usuario.apellido}`}
        textoBoton="Actualizar"
        esEdicion={true}
      />
    </div>
  );
}
