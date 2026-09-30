export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

import { createRequire } from "node:module";
import { eq } from "drizzle-orm";

// Prueba los route handlers reales (incluyendo withErrorHandling) sin
// depender de un servidor HTTP levantado -- útil en este entorno donde
// procesos en background no sobreviven entre llamadas de herramienta.

// mbid de la fixture que crea `smoke-test-ingestion.ts`: el release-group con
// el crédito "feat." sintético que este script quiere ver en el tracklist. Se
// elige por mbid (y no por título) porque puede haber más de una fila con el
// mismo título en la BD.
const DSOTM_MBID = "1e5eb684-d7e9-3699-8fed-6e2e5d0e0d16";

async function printResponse(label: string, res: Response) {
  const body = await res.json();
  console.log(`\n${label} -> HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2).slice(0, 1200));
}

/**
 * `next/server.after` solo existe dentro de una request de Next: al invocar el
 * route handler suelto, `scheduleEditionsSync`/`schedulePersonnelSync`/
 * `scheduleCoverMirror` lanzarían "after was called outside a request scope".
 * Se stubea a no-op con el mismo patrón `nodeModule._load` que los smoke tests
 * de auth usan para `next/headers`, para que el handler corra de verdad.
 */
function stubNextServerAfter() {
  const req = createRequire(import.meta.url);
  const nodeModule = req("node:module") as {
    _load: (request: string, parent: object | null, isMain: boolean) => unknown;
  };
  const originalLoad = nodeModule._load;
  nodeModule._load = function (request, parent, isMain) {
    const loaded = originalLoad.call(this, request, parent, isMain);
    if (request === "next/server") {
      return { ...(loaded as Record<string, unknown>), after: () => {} };
    }
    return loaded;
  };
}

async function main() {
  const { NextRequest } = await import("next/server");
  const { db } = await import("../src/db");
  const { artist, releaseGroup } = await import("../src/db/schema");

  const [pinkFloyd] = await db
    .select()
    .from(artist)
    .where(eq(artist.name, "Pink Floyd"))
    .limit(1);
  const [dsotm] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.mbid, DSOTM_MBID))
    .limit(1);

  if (!pinkFloyd || !dsotm) {
    throw new Error(
      "Corré primero scripts/smoke-test-ingestion.ts contra una BD de scratch virgen para poblar datos reales.",
    );
  }

  stubNextServerAfter();

  const { GET: artistByIdGET } =
    await import("../src/app/api/catalog/artist/[id]/route");
  const { GET: releaseGroupGET } =
    await import("../src/app/api/catalog/release-group/[id]/route");
  const { GET: releaseGroupCoverGET } =
    await import("../src/app/api/catalog/release-group/[id]/cover/route");
  const { GET: searchGET } =
    await import("../src/app/api/catalog/search/route");

  await printResponse(
    "1) GET /api/catalog/artist/[id] (perfil directo, endpoint nuevo)",
    await artistByIdGET(
      new NextRequest(`http://localhost/api/catalog/artist/${pinkFloyd.id}`),
      {
        params: Promise.resolve({ id: pinkFloyd.id }),
      },
    ),
  );

  await printResponse(
    "2) GET /api/catalog/release-group/[id] con créditos (feat., extensión nueva)",
    await releaseGroupGET(
      new NextRequest(`http://localhost/api/catalog/release-group/${dsotm.id}`),
      {
        params: Promise.resolve({ id: dsotm.id }),
      },
    ),
  );

  await printResponse(
    "3) GET /api/catalog/artist/[id] con id inexistente -> 404 + code",
    await artistByIdGET(
      new NextRequest(
        "http://localhost/api/catalog/artist/00000000-0000-0000-0000-000000000000",
      ),
      {
        params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
      },
    ),
  );

  await printResponse(
    "4) GET /api/catalog/search sin q -> 400 + code",
    await searchGET(new NextRequest("http://localhost/api/catalog/search")),
  );

  await printResponse(
    "5) GET /api/catalog/release-group/[id]/cover (cover-only, sin ingesta de tracklist)",
    await releaseGroupCoverGET(
      new NextRequest(`http://localhost/api/catalog/release-group/${dsotm.id}/cover`),
      {
        params: Promise.resolve({ id: dsotm.id }),
      },
    ),
  );

  // El resolvedor por lotes del artista principal (openspec: add-catalog-slugs)
  // es lo que el paso 2 ejercita por dentro; acá se comprueba explícitamente.
  const { resolvePrimaryArtists, slugArtistName } = await import(
    "../src/services/catalog/primary-artists"
  );
  const { releaseGroups } = await resolvePrimaryArtists({
    releaseGroupIds: [dsotm.id],
  });
  const primary = slugArtistName(releaseGroups.get(dsotm.id));
  console.log(
    `\n6) resolvePrimaryArtists -> artista principal de "${dsotm.title}": ${primary ?? "(ninguno)"}`,
  );
  if (primary !== "Pink Floyd") {
    console.error(
      `   ❌ se esperaba "Pink Floyd" como artista principal y llegó ${primary ?? "(ninguno)"}`,
    );
    process.exit(1);
  }
  console.log("   ✅ artista principal correcto");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
