export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

import { eq } from "drizzle-orm";

// Prueba los route handlers reales (incluyendo withErrorHandling) sin
// depender de un servidor HTTP levantado -- útil en este entorno donde
// procesos en background no sobreviven entre llamadas de herramienta.

async function printResponse(label: string, res: Response) {
  const body = await res.json();
  console.log(`\n${label} -> HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2).slice(0, 1200));
}

async function main() {
  const { NextRequest } = await import("next/server");
  const { db } = await import("../src/db");
  const { artist, releaseGroup } = await import("../src/db/schema");

  const [pinkFloyd] = await db.select().from(artist).where(eqName()).limit(1);
  function eqName() {
    return eq(artist.name, "Pink Floyd");
  }
  const [dsotm] = await db.select().from(releaseGroup).limit(1);

  if (!pinkFloyd || !dsotm) {
    throw new Error(
      "Corré primero scripts/smoke-test-ingestion.ts para poblar datos reales.",
    );
  }

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

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
