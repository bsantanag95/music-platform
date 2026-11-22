// Lógica pura de `REVIEW.md`: parseo de ítems (disparador → check → origen), lectura del diff y
// evaluación de qué ítems se disparan. Sin I/O: `review-triggers.ts` aporta el diff y el texto.
//
// Formato de un ítem en REVIEW.md:
//   ### R01 — Título
//   - **Rutas:** `src/db/schema.ts`, `src/**/*.ts`      (globs; el ítem se dispara si el diff toca alguna)
//   - **Excluye:** `**/*.test.ts`                       (opcional: rutas que no disparan el ítem)
//   - **Cambio:** A, M                                  (opcional: A añadido, M modificado, D borrado, R renombrado)
//   - **Patrón:** `/regex/i`                            (opcional: debe coincidir con una línea añadida)
//   - **Requiere:** `drizzle/*.sql@A`, `docs/x.md`      (opcional: globs que TAMBIÉN deben estar en el diff; `@A` exige archivo nuevo)
//   - **Resultado:** falla                              (opcional: si se dispara, falla sin más)
//   - **Check:** texto
//   - **Origen:** incidente o regla de origen

export type ChangeKind = "A" | "M" | "D" | "R";

export interface Requirement {
  glob: string;
  kind: ChangeKind | null;
}

export interface ReviewItem {
  id: string;
  title: string;
  paths: string[];
  excludes: string[];
  kinds: ChangeKind[] | null;
  pattern: RegExp | null;
  requires: Requirement[];
  alwaysFails: boolean;
  check: string;
  origin: string;
}

export interface ChangedFile {
  path: string;
  kind: ChangeKind;
  /** Líneas añadidas (sin el `+` inicial). */
  added: string[];
}

export type HitStatus = "falla" | "revisar";

export interface Hit {
  item: ReviewItem;
  files: string[];
  unmet: string[];
  status: HitStatus;
}

// ── Glob ────────────────────────────────────────────────────────────────────────────────────────

export function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

export function matchesGlob(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path.replace(/\\/g, "/"));
}

// ── Parseo de REVIEW.md ─────────────────────────────────────────────────────────────────────────

function backticks(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
}

function parseKinds(text: string): ChangeKind[] {
  return (text.match(/[AMDR]/g) ?? []) as ChangeKind[];
}

function parseRegex(text: string): RegExp | null {
  const token = backticks(text)[0];
  if (!token) return null;
  const m = token.match(/^\/(.*)\/([a-z]*)$/s);
  try {
    return m ? new RegExp(m[1]!, m[2]) : new RegExp(token);
  } catch {
    throw new Error(`Patrón inválido en REVIEW.md: ${token}`);
  }
}

export function parseReviewMd(markdown: string): ReviewItem[] {
  const items: ReviewItem[] = [];
  const blocks = markdown.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const header = lines[0] ?? "";
    const hm = header.match(/^(\S+)\s*[—–-]\s*(.+)$/);
    if (!hm) continue;
    const fields: Record<string, string> = {};
    let lastField: string | null = null;
    for (const line of lines.slice(1)) {
      const fm = line.match(/^-\s+\*\*([^:*]+):\*\*\s*(.*)$/);
      if (fm) {
        lastField = fm[1]!.trim().toLowerCase();
        fields[lastField] = fm[2]!.trim();
      } else if (lastField && /^\s+\S/.test(line)) {
        // Línea de continuación (sangrada) del campo anterior.
        fields[lastField] = `${fields[lastField]} ${line.trim()}`;
      } else {
        lastField = null;
      }
    }
    const paths = backticks(fields["rutas"] ?? "");
    if (paths.length === 0) continue;
    const requires: Requirement[] = backticks(fields["requiere"] ?? "").map((token) => {
      const at = token.lastIndexOf("@");
      if (at > 0 && /^[AMDR]$/.test(token.slice(at + 1))) {
        return { glob: token.slice(0, at), kind: token.slice(at + 1) as ChangeKind };
      }
      return { glob: token, kind: null };
    });
    items.push({
      id: hm[1]!,
      title: hm[2]!.trim(),
      paths,
      excludes: backticks(fields["excluye"] ?? ""),
      kinds: fields["cambio"] ? parseKinds(fields["cambio"]) : null,
      pattern: fields["patrón"] ? parseRegex(fields["patrón"]) : fields["patron"] ? parseRegex(fields["patron"]) : null,
      requires,
      alwaysFails: /^falla/i.test(fields["resultado"] ?? ""),
      check: fields["check"] ?? "",
      origin: fields["origen"] ?? "",
    });
  }
  return items;
}

// ── Lectura del diff ────────────────────────────────────────────────────────────────────────────

/** Parsea `git diff --name-status -M`. Para renombrados usa la ruta nueva. */
export function parseNameStatus(text: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0] ?? "";
    const path = (status.startsWith("R") || status.startsWith("C") ? parts[2] : parts[1]) ?? "";
    if (!path) continue;
    const kind: ChangeKind = status.startsWith("A") || status.startsWith("C")
      ? "A"
      : status.startsWith("D")
        ? "D"
        : status.startsWith("R")
          ? "R"
          : "M";
    files.push({ path: path.replace(/\\/g, "/"), kind, added: [] });
  }
  return files;
}

/** Parsea `git diff -U0` y devuelve las líneas añadidas por archivo. */
export function parseAddedLines(diff: string): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      const p = line.slice(4).replace(/^b\//, "");
      if (p === "/dev/null") {
        current = null;
      } else {
        current = byFile.get(p) ?? [];
        byFile.set(p, current);
      }
    } else if (line.startsWith("+") && current) {
      current.push(line.slice(1));
    }
  }
  return byFile;
}

// ── Evaluación ──────────────────────────────────────────────────────────────────────────────────

function requirementMet(req: Requirement, changes: ChangedFile[]): boolean {
  return changes.some((c) => matchesGlob(c.path, req.glob) && (req.kind === null || c.kind === req.kind));
}

export function evaluateItems(items: ReviewItem[], changes: ChangedFile[]): Hit[] {
  const hits: Hit[] = [];
  for (const item of items) {
    const files = changes.filter((c) => {
      if (!item.paths.some((g) => matchesGlob(c.path, g))) return false;
      if (item.excludes.some((g) => matchesGlob(c.path, g))) return false;
      if (item.kinds && !item.kinds.includes(c.kind)) return false;
      if (item.pattern && !c.added.some((l) => item.pattern!.test(l))) return false;
      return true;
    });
    if (files.length === 0) continue;
    const unmet = item.requires.filter((r) => !requirementMet(r, changes)).map((r) => `${r.glob}${r.kind ? `@${r.kind}` : ""}`);
    hits.push({
      item,
      files: files.map((f) => f.path),
      unmet,
      status: unmet.length > 0 || item.alwaysFails ? "falla" : "revisar",
    });
  }
  return hits;
}

export function formatHits(hits: Hit[]): string {
  if (hits.length === 0) return "REVIEW.md: ningún disparador coincide con el diff.";
  const lines: string[] = [];
  for (const h of hits) {
    lines.push(`[${h.status.toUpperCase()}] ${h.item.id} — ${h.item.title}`);
    lines.push(`  Disparado por: ${h.files.slice(0, 5).join(", ")}${h.files.length > 5 ? ` (+${h.files.length - 5})` : ""}`);
    if (h.unmet.length > 0) lines.push(`  Falta en el diff: ${h.unmet.join(", ")}`);
    lines.push(`  Check: ${h.item.check}`);
    lines.push(`  Por qué importa: ${h.item.origin}`);
  }
  return lines.join("\n");
}
