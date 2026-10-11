import { join } from "node:path";
import { AWARDS_DATA_DIR, readAllAwards, writeCeremony } from "@/services/awards/curation-files";
import { nomineeText } from "@/services/awards/curation-schema";
import { needsResolution, resolveNominee, type NomineeSearch } from "@/services/awards/resolve";
import { musicbrainz } from "@/services/musicbrainz/client";

/**
 * Resuelve a MBID los nominados de los archivos de premios (openspec: add-music-awards, design D3, ADR 0032).
 * Busca solo los que no tienen `resolved` (o, con `--retry`, los ambiguos y no encontrados), escribe el resultado
 * en el mismo archivo y termina con un reporte de lo que necesita revisión. Nunca elige entre dos candidatos
 * válidos. Todas las requests pasan por el cliente de MusicBrainz (rate limit y User-Agent).
 *
 * Para fijar un ambiguo o no encontrado a mano: cambiar `status` a "manual" y copiar el `mbid` y la `seed` del
 * candidato elegido.
 *
 * Uso:
 *   tsx --env-file=.env scripts/resolve-award-nominees.ts [--award grammy] [--year 2025] [--retry] [--dir <ruta>]
 *
 * Requiere MUSICBRAINZ_USER_AGENT. No escribe en la base.
 */

function arg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const search: NomineeSearch = {
  releaseGroups: async (query) => (await musicbrainz.searchReleaseGroup(query, { limit: 10 }))["release-groups"],
  recordings: async (query) => (await musicbrainz.searchRecording(query, { limit: 25 })).recordings,
  artists: async (query) => (await musicbrainz.searchArtist(query, { limit: 10 })).artists,
};

async function main() {
  const awardFilter = arg("--award");
  const yearFilter = arg("--year") ? Number(arg("--year")) : undefined;
  const retry = process.argv.includes("--retry");
  const dir = arg("--dir") ?? AWARDS_DATA_DIR;

  const { awards, errors } = readAllAwards(dir);
  if (errors.length > 0) {
    console.error(`Los archivos tienen errores; se corrigen antes de resolver:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  const counts = { exact: 0, manual: 0, ambiguous: 0, not_found: 0, skipped: 0 };
  const review: string[] = [];

  for (const award of awards) {
    if (awardFilter && award.slug !== awardFilter) continue;
    const definitions = new Map(award.categories.categories.map((c) => [c.key, c]));
    for (const ceremony of award.ceremonies) {
      if (yearFilter !== undefined && ceremony.data.year !== yearFilter) continue;
      console.log(`\n${ceremony.fileName}`);
      for (const category of ceremony.data.categories) {
        const definition = definitions.get(category.key)!;
        let changed = false;
        for (const nominee of category.nominees) {
          if (!needsResolution(nominee, retry)) {
            counts.skipped++;
            continue;
          }
          nominee.resolved = await resolveNominee(search, nominee, definition.subject);
          changed = true;
          const status = nominee.resolved.status;
          counts[status]++;
          const line = `  ${status.padEnd(9)} ${category.key} · ${nomineeText(nominee)}`;
          console.log(line);
          if (status === "ambiguous" || status === "not_found") {
            review.push(`${ceremony.fileName} › ${line.trim()}`);
            for (const candidate of nominee.resolved.candidates ?? []) {
              review.push(`      ${candidate.score} ${candidate.mbid} ${candidate.label}`);
            }
          }
        }
        // Se escribe por categoría: si el script se corta, lo resuelto no se pierde.
        if (changed) writeCeremony(ceremony.path, ceremony.data);
      }
    }
  }

  console.log(
    `\nResultado: ${counts.exact} exactos, ${counts.ambiguous} ambiguos, ${counts.not_found} no encontrados, ` +
      `${counts.skipped} ya resueltos (sin tocar).`,
  );
  if (review.length > 0) {
    console.log(`\nPara revisar (fijar con status "manual" y el mbid/seed del candidato elegido):\n${review.join("\n")}`);
  }
  console.log(`\nArchivos: ${join(dir)}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
