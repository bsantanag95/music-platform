// Aplica los ítems de REVIEW.md al diff actual (task 3.2).
//
//   node --import tsx scripts/verify/review-triggers.ts [--base main] [--local]
//
// REVIEW.md se lee de la rama base (`git show <base>:REVIEW.md`), nunca del árbol de trabajo, para que
// un cambio no pueda relajar el check que lo juzga. Solo si la rama base todavía no lo tiene (el cambio que
// lo introduce) se usa la copia local y se avisa. Sale con 1 si algún ítem queda en FALLA.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectChanges, readFileFromBase, repoRoots } from "./lib/git";
import { evaluateItems, formatHits, parseReviewMd, type Hit } from "./lib/review";

export interface ReviewRun {
  hits: Hit[];
  text: string;
  source: "base" | "local";
  failed: boolean;
}

export function runReview(cwd: string, base = "main", forceLocal = false): ReviewRun {
  const roots = repoRoots(cwd);
  let markdown = forceLocal ? null : readFileFromBase(base, "REVIEW.md", cwd);
  let source: ReviewRun["source"] = "base";
  if (markdown === null) {
    source = "local";
    markdown = readFileSync(join(roots.toplevel, "REVIEW.md"), "utf8");
  }
  const changes = collectChanges(base, cwd);
  const hits = evaluateItems(parseReviewMd(markdown), changes);
  const warning =
    source === "local" ? `(aviso: REVIEW.md no existe en ${base}; se usa la copia local)\n` : "";
  return { hits, text: warning + formatHits(hits), source, failed: hits.some((h) => h.status === "falla") };
}

if (process.argv[1] && /review-triggers\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf("--base");
  const base = baseIdx >= 0 ? (args[baseIdx + 1] ?? "main") : "main";
  const result = runReview(process.cwd(), base, args.includes("--local"));
  console.log(result.text);
  process.exit(result.failed ? 1 : 0);
}
