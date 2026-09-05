import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
  return drizzle({ client: pool, schema });
}
