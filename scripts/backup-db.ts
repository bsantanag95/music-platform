// Script de backup de la base de datos local (Ver docs/06-operations/backup-restore.md).
//
// Ejecuta `pg_dump` (custom format) de la BD principal (`music_platform`) y de
// la scratch (`music_platform_scratch`, por conveniencia, es Efímera) hacia
// `backups/` con un timestamp, y poda los dumps viejos dejando los últimos N
// (BACKUP_RETENTION, default 7).
//
// Las BDs objetivo NO dependen del nombre de BD de DATABASE_URL: esa variable
// solo aporta host/puerto/usuario/contrasena (puede apuntar a la scratch si se
// usa para smoke tests). El nombre principal se configura con
// PRINCIPAL_DB_NAME (default `music_platform`) y la scratch siempre se agrega
// si existe.
//
// Uso:
//   npx tsx --env-file=.env scripts/backup-db.ts
//
// Variables de entorno:
//   DATABASE_URL  (obligatoria) — conexión: aporta host/puerto/usuario/password.
//   PRINCIPAL_DB_NAME (opcional) — nombre de la BD principal (default music_platform).
//   PG_BIN_DIR    (opcional) — directorio con pg_dump; si falta se autodetecta.
//   BACKUP_RETENTION (opcional) — número de dumps por BD a conservar (default 7).
//   BACKUP_DIR    (opcional) — directorio destino (default <repo>/backups).

export {}; // fuerza module scope, igual que los smoke tests de scripts/

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BACKUP_DIR = process.env.BACKUP_DIR ?? join(ROOT, "backups");
const RETENTION = Number(process.env.BACKUP_RETENTION ?? 7);

interface DbTarget {
  label: string;
  dbname: string;
  required: boolean;
}

function parseDbUrl(url: string): { user: string; password: string; host: string; port: number; dbname: string } {
  const m =
    /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/.exec(url);
  if (!m) {
    throw new Error(`DATABASE_URL no tiene la forma esperada postgres://user:pass@host:port/db: ${url}`);
  }
  const g = (i: number): string => {
    const v = m[i];
    if (v === undefined) throw new Error("DATABASE_URL malformada");
    return v;
  };
  return { user: g(1), password: g(2), host: g(3), port: Number(g(4)), dbname: g(5) };
}

function findPgBinDir(port: number): string {
  if (process.env.PG_BIN_DIR) {
    const dir = process.env.PG_BIN_DIR;
    if (!existsSync(join(dir, "pg_dump.exe"))) {
      throw new Error(`PG_BIN_DIR no contiene pg_dump.exe: ${dir}`);
    }
    return dir;
  }
  const base = "C:\\Program Files\\PostgreSQL";
  if (!existsSync(base)) {
    throw new Error(`No existe ${base}; define PG_BIN_DIR con la ruta a los binarios de PostgreSQL`);
  }
  // Autodetección: el bin de la instancia que escucha en el puerto de DATABASE_URL.
  const candidates = readdirSync(base)
    .filter((d) => /^\d+$/.test(d))
    .sort((a, b) => Number(b) - Number(a)); // de mayor a menor versión
  for (const ver of candidates) {
    const conf = join(base, ver, "data", "postgresql.conf");
    let confPort: number | null = null;
    if (existsSync(conf)) {
      const txt = readFileSync(conf, "utf8");
      const m = /^\s*port\s*=\s*(\d+)/m.exec(txt);
      if (m) confPort = Number(m[1]);
    }
    const bin = join(base, ver, "bin");
    if (existsSync(join(bin, "pg_dump.exe"))) {
      // Prioriza el que coincide con el puerto; si no, usa la versión más alta.
      if (confPort === port || confPort === null) {
        if (confPort === port) return bin;
      }
    }
  }
  // Fallback: cualquier bin con pg_dump, priorizando la mayor versión.
  for (const ver of candidates) {
    const bin = join(base, ver, "bin");
    if (existsSync(join(bin, "pg_dump.exe"))) return bin;
  }
  throw new Error("No se encontró pg_dump.exe bajo C:\\Program Files\\PostgreSQL; define PG_BIN_DIR");
}

function prune(dir: string, dbname: string, keep: number): void {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(`${dbname}.`) && f.endsWith(".dump"))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t); // más reciente primero
  for (const { f } of files.slice(keep)) {
    rmSync(join(dir, f));
  }
}

function main(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL en las variables de entorno (correr con --env-file=.env)");
  }
  const mainDb = parseDbUrl(process.env.DATABASE_URL);
  const principal = process.env.PRINCIPAL_DB_NAME ?? "music_platform";
  // La scratch se respalda por conveniencia (es Efímera, no crítica); no falla si no existe.
  const targets: DbTarget[] = [
    { label: "principal", dbname: principal, required: true },
    { label: "scratch", dbname: "music_platform_scratch", required: false },
  ];

  const pgBin = findPgBinDir(mainDb.port);
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  mkdirSync(BACKUP_DIR, { recursive: true });

  for (const t of targets) {
    const out = join(BACKUP_DIR, `${t.dbname}.${stamp}.dump`);
    try {
      execFileSync(
        join(pgBin, "pg_dump.exe"),
        [
          "--format=custom",
          "--no-owner",
          "--no-privileges",
          "--compress=6",
          `--dbname=${t.dbname}`,
          `--username=${mainDb.user}`,
          `--host=${mainDb.host}`,
          `--port=${String(mainDb.port)}`,
          `--file=${out}`,
        ],
        { env: { ...process.env, PGPASSWORD: mainDb.password }, stdio: "inherit" },
      );
      prune(BACKUP_DIR, t.dbname, RETENTION);
    } catch (err) {
      if (!t.required && !existsSync(out)) {
        console.warn(`[backup] BD opcional '${t.dbname}' no disponible; se omite.`);
        continue;
      }
      throw new Error(`[backup] Falló pg_dump de '${t.dbname}': ${(err as Error).message}`);
    }
    const size = existsSync(out) ? statSync(out).size : 0;
    console.log(`[backup] OK ${t.label} (${t.dbname}) -> ${out} (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log(`[backup] Retención: ${RETENTION} dumps por BD en ${BACKUP_DIR}`);
}

main();
