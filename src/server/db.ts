import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/server/schema";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(new Pool({ connectionString: url }), { schema });
}

export type Database = ReturnType<typeof connect>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

let cached: Database | undefined;

export function database(): Database {
  if (!cached) cached = connect();
  return cached;
}
