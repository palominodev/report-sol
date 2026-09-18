import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@libsql/client';
import { TursoUserRepository, deriveCargo } from '../turso-user.repository';
import { setDatabaseClient } from '../database.client';

type DatabaseClient = ReturnType<typeof createClient>;

async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`
    CREATE TABLE usuario (
      id_usuario INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      genero TEXT,
      familia_id INTEGER
    )
  `);
  await client.execute('CREATE TABLE rol (id_rol INTEGER PRIMARY KEY, rol TEXT NOT NULL)');
  await client.execute(
    'CREATE TABLE usuario_rol (id_usuario INTEGER NOT NULL, id_rol INTEGER NOT NULL)'
  );

  await client.execute({
    sql: "INSERT INTO usuario (id_usuario, nombre, apellido, genero, familia_id) VALUES (1, 'Sandro', 'Valeriano', 'masculino', 7)",
    args: [],
  });
  await client.execute({
    sql: "INSERT INTO usuario (id_usuario, nombre, apellido, genero, familia_id) VALUES (2, 'Sonia', 'Fernández', 'femenino', NULL)",
    args: [],
  });
  await client.execute({
    sql: "INSERT INTO usuario (id_usuario, nombre, apellido, genero, familia_id) VALUES (3, 'Mauro', 'Cancho', 'masculino', 7)",
    args: [],
  });

  await client.execute({ sql: "INSERT INTO rol (id_rol, rol) VALUES (1, 'anciano')", args: [] });
  await client.execute({ sql: "INSERT INTO rol (id_rol, rol) VALUES (2, 'siervo')", args: [] });
  await client.execute({ sql: "INSERT INTO rol (id_rol, rol) VALUES (3, 'publicador')", args: [] });

  // usuario 1: anciano; usuario 3: siervo; usuario 2: no roles.
  await client.execute({ sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (1, 1)', args: [] });
  await client.execute({ sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (1, 3)', args: [] });
  await client.execute({ sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (3, 2)', args: [] });
  return client;
}

afterEach(() => {
  setDatabaseClient(null);
});

describe('deriveCargo', () => {
  it('derives siervo from a role CSV that includes siervo', () => {
    expect(deriveCargo('secretario,siervo,auxiliar')).toBe('siervo');
  });

  it('prefers anciano over siervo when both are present', () => {
    expect(deriveCargo('siervo,anciano,publicador')).toBe('anciano');
  });

  it('returns null for roles that are neither anciano nor siervo', () => {
    expect(deriveCargo('publicador,auxiliar')).toBeNull();
  });

  it('returns null when the person has no roles at all', () => {
    expect(deriveCargo(null)).toBeNull();
  });
});

describe('TursoUserRepository.findAllAssignable', () => {
  it('projects cargo and familia_id onto AssignablePerson', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoUserRepository();

    const persons = await repo.findAllAssignable();

    const sandro = persons.find((p) => p.id_usuario === 1)!;
    expect(sandro.cargo).toBe('anciano');
    expect(sandro.familia_id).toBe(7);

    const sonia = persons.find((p) => p.id_usuario === 2)!;
    expect(sonia.cargo).toBeNull();
    expect(sonia.familia_id).toBeNull();

    const mauro = persons.find((p) => p.id_usuario === 3)!;
    expect(mauro.cargo).toBe('siervo');
    expect(mauro.familia_id).toBe(7);
  });

  it('still projects id, name and genero for every usuario row', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoUserRepository();

    const persons = await repo.findAllAssignable();

    expect(persons).toHaveLength(3);
    expect(persons.map((p) => [p.nombre, p.apellido, p.genero])).toEqual([
      ['Sandro', 'Valeriano', 'masculino'],
      ['Sonia', 'Fernández', 'femenino'],
      ['Mauro', 'Cancho', 'masculino'],
    ]);
  });
});