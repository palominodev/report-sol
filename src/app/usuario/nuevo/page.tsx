import { createClient } from '@libsql/client';
import FormularioUsuario from '../../components/FormularioUsuario';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

async function getGrupos() {
  const client = createClient({ url, authToken: token });
  const result = await client.execute('SELECT id_grupo, nombre FROM grupo');
  return result.rows.map(row => ({ id_grupo: row.id_grupo as number, nombre: row.nombre as string }));
}

export default async function Page() {
  const grupos = await getGrupos();

  return (
    <FormularioUsuario
      grupos={grupos}
      titulo="Nuevo Usuario"
      textoBoton="Crear"
    />
  );
} 