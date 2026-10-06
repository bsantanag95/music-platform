import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { inArray } from "drizzle-orm";
import { fetchCoverThumb } from "@/services/cover-art";
import { isValidUuid } from "@/lib/validation";
import {
  HERO_COVERS,
  HERO_COVER_COUNT,
  HERO_WALL,
} from "@/lib/config/hero-covers";

/**
 * Compone el mosaico del hero anónimo a partir de `HERO_COVERS`
 * (docs/05-features/home.md, "Muro de carátulas").
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/build-hero-wall.ts
 *   npx tsx scripts/build-hero-wall.ts --placeholder   # tonos neutros, sin red ni BD
 *
 * Descarga el `front-250` de cada release-group (misma fuente y tamaño que el
 * espejo, ADR 0018), los recorta cuadrados y los pega en una sola imagen WebP
 * en `public/hero/wall.webp`. Es una copia almacenada de carátulas: por eso
 * rechaza cualquier release-group con `cover_blocked_at` (retiro a pedido) y
 * aborta si falta o falla una portada — nunca publica un mosaico a medias.
 * Si hay un retiro nuevo: sacar la entrada de `HERO_COVERS` y volver a correr.
 */
const { cols, rows, tile, src } = HERO_WALL;

async function assertNoneBlocked(mbids: string[]): Promise<void> {
  const { db } = await import("@/db");
  const { releaseGroup } = await import("@/db/schema");
  const rows = await db
    .select({ mbid: releaseGroup.mbid, blockedAt: releaseGroup.coverBlockedAt })
    .from(releaseGroup)
    .where(inArray(releaseGroup.mbid, mbids));
  const blocked = rows.filter((row) => row.blockedAt !== null);
  if (blocked.length > 0) {
    throw new Error(
      `Carátulas con retiro vigente (cover_blocked_at), sacarlas de HERO_COVERS: ${blocked
        .map((row) => row.mbid)
        .join(", ")}`,
    );
  }
}

async function placeholderTiles(): Promise<Buffer[]> {
  return Promise.all(
    Array.from({ length: HERO_COVER_COUNT }, (_, i) =>
      sharp({
        create: {
          width: tile,
          height: tile,
          channels: 3,
          // Variación leve de gris para que se note la rejilla.
          background: { r: 36 + (i % 5) * 6, g: 34 + (i % 5) * 6, b: 32 + (i % 5) * 6 },
        },
      })
        .png()
        .toBuffer(),
    ),
  );
}

async function coverTiles(): Promise<Buffer[]> {
  if (HERO_COVERS.length !== HERO_COVER_COUNT) {
    throw new Error(
      `HERO_COVERS tiene ${HERO_COVERS.length} entradas; se necesitan exactamente ${HERO_COVER_COUNT}.`,
    );
  }
  const mbids = HERO_COVERS.map((cover) => cover.mbid);
  if (mbids.some((mbid) => !isValidUuid(mbid))) throw new Error("Hay un MBID inválido en HERO_COVERS.");
  if (new Set(mbids).size !== mbids.length) throw new Error("HERO_COVERS tiene MBID repetidos.");

  await assertNoneBlocked(mbids);

  const tiles: Buffer[] = [];
  for (const cover of HERO_COVERS) {
    const result = await fetchCoverThumb(cover.mbid);
    if (result.status !== "found") {
      throw new Error(`Sin carátula (${result.status}): ${cover.artist} — ${cover.title} (${cover.mbid})`);
    }
    tiles.push(await sharp(result.bytes).resize(tile, tile, { fit: "cover" }).png().toBuffer());
    console.log(`  ok ${tiles.length}/${HERO_COVER_COUNT} ${cover.artist} — ${cover.title}`);
  }
  return tiles;
}

async function main(): Promise<void> {
  const tiles = process.argv.includes("--placeholder") ? await placeholderTiles() : await coverTiles();

  const buffer = await sharp({
    create: { width: cols * tile, height: rows * tile, channels: 3, background: "#000" },
  })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * tile, top: Math.floor(i / cols) * tile })))
    .webp({ quality: 72, effort: 6 })
    .toBuffer();

  const out = path.join(process.cwd(), "public", src);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, buffer);
  console.log(`Mosaico ${cols * tile}x${rows * tile} → public${src} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

main()
  // `process.exit`: el pool de la BD (import dinámico) mantiene vivo el proceso.
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error fatal:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
