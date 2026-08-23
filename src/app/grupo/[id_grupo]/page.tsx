import ListaIntegrantes from '../../../components/ListaIntegrantes';
import { getGrupoDetail } from '@/lib/getGrupoDetail';

interface PageProps {
  params: Promise<{
    id_grupo: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const now = new Date();
  let mesIdx = now.getMonth();
  let año = now.getFullYear();
  if (mesIdx === 0) {
    mesIdx = 11;
    año -= 1;
  } else {
    mesIdx -= 1;
  }
  const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const mesAnterior = meses[mesIdx];

  const idGrupo = Number(params.id_grupo);
  const grupoDetail = Number.isInteger(idGrupo) && idGrupo > 0
    ? await getGrupoDetail(idGrupo, mesAnterior, año)
    : { nombreGrupo: '', integrantes: [] };

  return (
    <ListaIntegrantes
      integrantes={grupoDetail.integrantes}
      nombreGrupo={grupoDetail.nombreGrupo}
      mes={mesAnterior}
      año={año}
    />
  );
}
