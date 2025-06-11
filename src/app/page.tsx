import Link from "next/link";
import { getGrupos } from "@/lib/getGrupos";

export default async function Home() {
  const grupos = await getGrupos();

  return (
    <main>
      <section>
        <Link href="/usuario/nuevo">
          <button style={{marginBottom: '1rem'}}>Crear usuario</button>
        </Link>
        <h1>Grupos</h1>
        <ul>
          {grupos.map((grupo: any, idx: number) => (
            <li key={idx}>{JSON.stringify(grupo)}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
