// I/O de git para los scripts de `verify`: raíces del repo/worktree, huella del árbol y lectura del
// diff contra la rama base. La lógica pura vive en `review.ts` y `stop-logic.ts`.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseAddedLines, parseNameStatus, type ChangedFile } from "./review";

const MAX_BUFFER = 256 * 1024 * 1024;
const MAX_UNTRACKED_BYTES = 1024 * 1024;

export function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER, stdio: ["ignore", "pipe", "pipe"] });
}

export function tryGit(args: string[], cwd: string): string | null {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

export interface RepoRoots {
  /** Raíz del árbol de trabajo actual (el worktree, si se está en uno). */
  toplevel: string;
  /** Raíz del checkout principal (donde vive el `.git` real). */
  mainRoot: string;
  isWorktree: boolean;
}

export function repoRoots(cwd: string): RepoRoots {
  const toplevel = resolve(git(["rev-parse", "--show-toplevel"], cwd).trim());
  const commonDir = resolve(git(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd).trim());
  const mainRoot = commonDir.endsWith(".git") ? dirname(commonDir) : toplevel;
  return { toplevel, mainRoot, isWorktree: resolve(mainRoot) !== toplevel };
}

export function porcelain(cwd: string): string {
  return git(["status", "--porcelain", "--untracked-files=all"], cwd);
}

function untrackedFiles(cwd: string): string[] {
  return git(["ls-files", "--others", "--exclude-standard", "-z"], cwd)
    .split("\0")
    .filter(Boolean);
}

function readSmallText(path: string): string | null {
  try {
    if (statSync(path).size > MAX_UNTRACKED_BYTES) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** Huella por contenido del árbol de trabajo: no cambia por hacer `git add`, sí por editar archivos. */
export function codeFingerprint(cwd: string): string {
  const hash = createHash("sha1");
  hash.update(tryGit(["rev-parse", "HEAD"], cwd) ?? "no-head");
  hash.update(git(["diff", "HEAD"], cwd));
  for (const file of untrackedFiles(cwd).sort()) {
    hash.update(`\0${file}\0`);
    hash.update(readSmallText(join(cwd, file)) ?? "");
  }
  return hash.digest("hex");
}

/** Contenido de un archivo en la rama base (no en el árbol de trabajo); `null` si no existe allí. */
export function readFileFromBase(base: string, path: string, cwd: string): string | null {
  return tryGit(["show", `${base}:${path}`], cwd);
}

/** Cambios (confirmados, preparados, sin preparar y sin seguimiento) respecto del ancestro común con `base`. */
export function collectChanges(base: string, cwd: string): ChangedFile[] {
  const mergeBase = tryGit(["merge-base", base, "HEAD"], cwd)?.trim() || base;
  const files = parseNameStatus(git(["diff", "--name-status", "-M", mergeBase], cwd));
  const added = parseAddedLines(git(["diff", "-U0", "-M", mergeBase], cwd));
  for (const f of files) f.added = added.get(f.path) ?? [];
  for (const path of untrackedFiles(cwd)) {
    const text = readSmallText(join(cwd, path));
    files.push({ path: path.replace(/\\/g, "/"), kind: "A", added: text ? text.split(/\r?\n/) : [] });
  }
  return files;
}
