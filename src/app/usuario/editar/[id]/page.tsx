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
  };

  return (
    <FormularioUsuario
      grupos={grupos}
      usuarioInicial={usuario}
      titulo={`Editar Usuario ${usuario.nombre} ${usuario.apellido}`}
      textoBoton="Actualizar"
      esEdicion={true}
    />
  );
}
