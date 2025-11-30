import { SQL, sql } from "drizzle-orm";

export function excluded(columnName: string): SQL {
  const quoted = `"${columnName}"`;
  return sql.raw(`EXCLUDED.${quoted}`);
}
