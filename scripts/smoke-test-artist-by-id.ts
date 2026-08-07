export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

// Prueba el segundo camino de entrada al mismo problema: alguien navega
// directo a /artista/[id] de un stub creado desde un feat. (en vez de
// buscarlo por nombre, como en smoke-test-unknown-enrichment.ts).

const FARRUKO_MBID = "9b90d5a6-8b3f-4e2d-9f11-7e0c0d3a1a01";

const mockResponses: Record<string, unknown> = {
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

async function main() {
  const { upsertArtistStub, getArtistById } = await import("../src/services/catalog/ingest-artist");

  console.log("1) Stub 'unknown' creado desde un feat. (mismo punto de partida que Farruko)...");
  const stub = await upsertArtistStub(FARRUKO_MBID, "Farruko");
  console.log("   ->", stub);

  console.log("2) Alguien navega directo a /artista/" + stub.id + " (no por nombre)...");
  const enriched = await getArtistById(stub.id);
  console.log("   ->", enriched);

  console.log("3) Un id inexistente debe devolver null (404 en la ruta)...");
  const missing = await getArtistById("00000000-0000-0000-0000-000000000000");
  console.log("   ->", missing);

  global.fetch = realFetch;

  if (enriched?.type === "person" && enriched.id === stub.id && missing === null) {
    console.log("\n✅ getArtistById enriquece por id y devuelve null ante un id inexistente.");
  } else {
    console.log("\n❌ Sigue fallando.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
