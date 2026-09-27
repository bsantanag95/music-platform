import { setArtistPhotoBlocked } from "@/services/catalog/artist-wikimedia";

/**
 * Retiro a pedido de la foto de un artista (openspec: enrich-artist-profile, ADR 0021): la
 * vacía y marca `artist.photo_blocked_at`, de modo que el enriquecimiento de Wikimedia no se
 * la vuelva a asignar. `--undo` quita la marca y deja al artista pendiente de un nuevo
 * enriquecimiento (la próxima visita o el backfill vuelven a buscar su foto).
 *
 * Uso:
 *   tsx --env-file=.env scripts/takedown-artist-photo.ts <artist-uuid> [--undo]
 *
 * Requiere DATABASE_URL en el entorno.
 */

async function main() {
  const args = process.argv.slice(2);
  const artistId = args.find((arg) => !arg.startsWith("--"));
  const undo = args.includes("--undo");
  if (!artistId) {
    console.error("Uso: tsx --env-file=.env scripts/takedown-artist-photo.ts <artist-uuid> [--undo]");
    process.exit(1);
  }

  const row = await setArtistPhotoBlocked(artistId, !undo);
  if (!row) {
    console.error(`No existe el artista ${artistId}`);
    process.exit(1);
  }
  console.log(
    undo
      ? `Foto desbloqueada para ${row.name}: se volverá a buscar en el próximo enriquecimiento.`
      : `Foto retirada y bloqueada para ${row.name}.`,
  );
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
