import { createClient } from '@libsql/client';

type DatabaseClient = ReturnType<typeof createClient>;

let client: DatabaseClient | null = null;

export function getDatabaseClient(): DatabaseClient {
  if (!client) {
    const url = process.env.TURSO_URL;
    const token = process.env.TURSO_TOKEN;

    if (!url || !token) {
      throw new Error('TURSO_URL and TURSO_TOKEN must be defined in environment variables');
    }

    client = createClient({ url, authToken: token });
  }

  return client;
}

export async function executeQuery(sql: string, args?: (string | number | null | Uint8Array)[]) {
  const client = getDatabaseClient();
  return client.execute({ sql, args });
}
