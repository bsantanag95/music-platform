// Reproduce exactamente el escenario reportado: Farruko aparece como
// stub 'unknown' vía un feat. en un track de Sabrina Carpenter, y después
// alguien lo busca directamente por nombre. El type debe pasar a 'person'.

export {}; // fuerza module scope; sin esto, TS trata el archivo como script global y colisiona con otros scripts/*.ts
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { runSmoke, type SmokeContext } from "./smoke-lib/run";

assertSmokeAllowed();

const FARRUKO_MBID = "9b90d5a6-8b3f-4e2d-9f11-7e0c0d3a1a01";

const mockResponses: Record<string, unknown> = {
  // Paso 1: se ingiere un track con Sabrina Carpenter feat. Farruko ->
  // Farruko queda creado como stub 'unknown' (no se llama a este mock,
  // se simula directo con upsertArtistStub más abajo).

  // Paso 2: alguien busca "Farruko" directamente.
  "/artist?query=Farruko&fmt=json": {
    artists: [{ id: FARRUKO_MBID, name: "Farruko", type: "Person", disambiguation: "reguetonero puertorriqueño" }],
  },
  // La corrección consulta por id, no por nombre -- este es el mock que debería usarse:
  [`/artist/${FARRUKO_MBID}?fmt=json`]: {
    id: FARRUKO_MBID,
    name: "Farruko",
    type: "Person",
    disambiguation: "reguetonero puertorriqueño",
  },
};

const realFetch = global.fetch;
global.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(input.toString());
  const key = `${url.pathname.replace("/ws/2", "")}?${url.searchParams.toString()}`;
  const body = mockResponses[key];
  if (!body) {
    throw new Error(`No hay mock para: ${key}\nDisponibles:\n${Object.keys(mockResponses).join("\n")}`);
  }
  return new Response(JSON.stringify(body), { status: 200 });
}) as typeof fetch;

async function main(ctx: SmokeContext) {
  const { upsertArtistStub, findOrIngestArtist } = await import("../src/services/catalog/ingest-artist");

  console.log("1) Simulando que Farruko ya quedó credited como feat. (stub 'unknown')...");
  const stub = await upsertArtistStub(FARRUKO_MBID, "Farruko");
  console.log("   ->", stub);

  console.log("2) Alguien busca 'Farruko' directamente...");
  const enriched = await findOrIngestArtist("Farruko");
  console.log("   ->", enriched);

  global.fetch = realFetch;
  ctx.check(
    enriched?.type === "person" && enriched.id === stub.id,
    "la misma fila pasó de 'unknown' a 'person', sin duplicarse",
  );
}

/** Borra el stub sintético "Farruko" (mismo MBID que `smoke-test-artist-by-id.ts`). */
async function cleanup() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { artist } = await import("../src/db/schema");
  await db.delete(artist).where(eq(artist.mbid, FARRUKO_MBID));
}

void runSmoke({ name: "unknown-enrichment", cleanup, run: main });
