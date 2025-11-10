import { renderApi } from '../../api/client';
import { poll } from '../../utils/polling';
import type { RenderDatabase, DatabaseConnectionInfo, DatabaseResult } from './types';

const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID;

async function getConnectionString(dbId: string): Promise<string> {
  const response = await renderApi.get<DatabaseConnectionInfo>(`/postgres/${dbId}/connection-info`);
  return response.data.internalConnectionString;
}

export const databaseModule = {
  async check(name: string): Promise<DatabaseResult | null> {
    const response = await renderApi.get<{ postgres: RenderDatabase }[]>('/postgres', {
      params: { name, includeReplicas: true, limit: 20 },
    });

    const databases = response.data;
    if (Array.isArray(databases) && databases.length > 0) {
      const dbId = databases[0].postgres.id;
      const connectionString = await getConnectionString(dbId);
      return { id: dbId, connectionString };
    }
    return null;
  },

  async create(): Promise<DatabaseResult> {
    console.log('🗄️  Creating PostgreSQL database...');

    const response = await renderApi.post<{ id: string }>('/postgres', {
      name: 'test',
      ownerId: RENDER_OWNER_ID,
      enableHighAvailability: false,
      plan: 'free',
      version: '17',
    });

    const databaseId = response.data.id;
    console.log(`✅ Database created: ${databaseId}`);

    const connectionString = await getConnectionString(databaseId);
    console.log(`📋 Connection string: ${connectionString}`);

    return { id: databaseId, connectionString };
  },

  async waitForAvailability(databaseId: string): Promise<void> {
    console.log('⏳ Waiting for database to be available...');

    await poll(
      async (_attempt) => {
        const response = await renderApi.get<{ status: string }>(`/postgres/${databaseId}`);
        return { status: response.data.status };
      },
      ['available'],
      [],
      { maxAttempts: 30, delayMs: 5000 }
    );
  },
};
