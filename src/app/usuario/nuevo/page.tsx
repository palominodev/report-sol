import FormularioUsuario from '../../components/FormularioUsuario';
import { getGruposSummary } from '@/lib/getGrupos';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const grupos = await getGruposSummary();

  return (
    <FormularioUsuario
      grupos={grupos}
      titulo="Nuevo Usuario"
      textoBoton="Crear"
    />
  );
}
