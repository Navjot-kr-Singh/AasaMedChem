import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Prevent multiple database connections in Next.js development mode hot-reloading
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
  db: any | undefined;
};

const pool = globalForDb.conn ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalForDb.conn = pool;

const db = (globalForDb.db as ReturnType<typeof drizzle>) ?? drizzle(pool, { schema });
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export { db, pool };
export type DbClient = typeof db;
