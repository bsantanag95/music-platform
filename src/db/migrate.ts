// Aplica, en orden, los archivos .sql de /drizzle que todavía no fueron
// ejecutados contra la base. Cada migración corre dentro de su propia
// transacción. Ver docs/02-architecture/adr/0005-orm-drizzle-migraciones-sql.md
// para el porqué de no usar `drizzle-kit generate`.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL en las variables de entorno");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql<{ filename: string }[]>`SELECT filename FROM _migrations`).map(
      (row) => row.filename,
    ),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ↷ ya aplicada: ${file}`);
      continue;
    }

    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`  → aplicando: ${file}`);

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
    });
  }

  console.log("Migraciones al día.");
  await sql.end();
}

main().catch((err) => {
  console.error("Error aplicando migraciones:", err);
  process.exit(1);
});
