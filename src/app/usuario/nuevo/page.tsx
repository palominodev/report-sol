import FormularioUsuario from '../../components/FormularioUsuario';
import { getGruposSummary } from '@/lib/getGrupos';
import { requireAccount } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireAccount();
  const grupos = await getGruposSummary();

  return (
    <FormularioUsuario
      grupos={grupos}
      titulo="Nuevo Usuario"
      textoBoton="Crear"
    />
  );
}
