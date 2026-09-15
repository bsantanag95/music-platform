import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveJourneyState, sortDiscographyByYear } from "./artist-journeys";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
  getArtistById: vi.fn(),
  findOrIngestDiscography: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/catalog/ingest-artist", () => ({ getArtistById: mocks.getArtistById }));
vi.mock("@/services/catalog/ingest-discography", () => ({
  findOrIngestDiscography: mocks.findOrIngestDiscography,
}));

// Objeto chainable y thenable a la vez: cada método del query builder de
// Drizzle devuelve el mismo objeto, y `await` en cualquier punto de la
// cadena resuelve a `result` (JS llama a `.then` sin importar cuántos
// métodos se hayan encadenado antes). Evita tener que replicar la forma
// exacta de cada cadena (select().from().where() vs. ...limit(), etc.).
function chain(result: unknown, onValues?: (values: unknown) => void) {
  const obj: Record<string, unknown> = {
    from: () => obj,
    innerJoin: () => obj,
    leftJoin: () => obj,
    where: () => obj,
    limit: () => obj,
    orderBy: () => obj,
    offset: () => obj,
    groupBy: () => obj,
    values: (values: unknown) => {
      onValues?.(values);
      return obj;
    },
    set: () => obj,
    onConflictDoNothing: () => obj,
    returning: () => obj,
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return obj;
}

const artistId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000002";
const listId = "00000000-0000-4000-8000-000000000003";
const sg1 = "00000000-0000-4000-8000-000000000010";
const sg2 = "00000000-0000-4000-8000-000000000011";

const artistRow = { id: artistId, name: "Deep Purple" };
const discography = [
  { id: sg1, title: "In Rock", category: "studio", firstReleaseYear: 1970, coverThumbUrl: null },
  { id: sg2, title: "Made in Japan", category: "live_other", firstReleaseYear: 1972, coverThumbUrl: null },
];

const journeyRow = {
  id: listId,
  journeyArchivedAt: null as Date | null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("deriveJourneyState", () => {
  it("archivado tiene prioridad sobre cualquier progreso", () => {
    expect(deriveJourneyState(new Date(), 5, 5)).toBe("archived");
    expect(deriveJourneyState(new Date(), 0, 0)).toBe("archived");
  });

  it("selección vacía nunca es completo", () => {
    expect(deriveJourneyState(null, 0, 0)).toBe("in_progress");
  });

  it("completo solo cuando toda la selección está escuchada", () => {
    expect(deriveJourneyState(null, 3, 3)).toBe("complete");
    expect(deriveJourneyState(null, 3, 2)).toBe("in_progress");
  });
});

describe("sortDiscographyByYear", () => {
  it("ordena por año ascendente", () => {
    const result = sortDiscographyByYear([
      { title: "C", firstReleaseYear: 1990 },
      { title: "A", firstReleaseYear: 1970 },
      { title: "B", firstReleaseYear: 1980 },
    ]);
    expect(result.map((r) => r.title)).toEqual(["A", "B", "C"]);
  });

  it("los álbumes sin año quedan al final", () => {
    const result = sortDiscographyByYear([
      { title: "Sin año", firstReleaseYear: null },
      { title: "1980", firstReleaseYear: 1980 },
      { title: "1970", firstReleaseYear: 1970 },
    ]);
    expect(result.map((r) => r.title)).toEqual(["1970", "1980", "Sin año"]);
  });

  it("desempata por título cuando coincide el año", () => {
    const result = sortDiscographyByYear([
      { title: "Zeta", firstReleaseYear: 2000 },
      { title: "Alfa", firstReleaseYear: 2000 },
    ]);
    expect(result.map((r) => r.title)).toEqual(["Alfa", "Zeta"]);
  });

  it("desempata alfabéticamente entre varios sin año", () => {
    const result = sortDiscographyByYear([
      { title: "Zeta", firstReleaseYear: null },
      { title: "Alfa", firstReleaseYear: null },
    ]);
    expect(result.map((r) => r.title)).toEqual(["Alfa", "Zeta"]);
  });

  it("no muta el arreglo original", () => {
    const original = [
      { title: "B", firstReleaseYear: 1990 },
      { title: "A", firstReleaseYear: 1970 },
    ];
    const result = sortDiscographyByYear(original);
    expect(original.map((r) => r.title)).toEqual(["B", "A"]);
    expect(result.map((r) => r.title)).toEqual(["A", "B"]);
  });
});

describe("servicio de artist-journeys", () => {
  beforeEach(() => {
    // `resetAllMocks` (no `clearAllMocks`): también vacía la cola de
    // `mockReturnValueOnce` entre tests — si no, un mock no consumido en un
    // test (ej. listenedReleaseGroupIds con discografía vacía, que corta
    // antes) se arrastra al siguiente y desalinea sus propias respuestas
    // encoladas.
    vi.resetAllMocks();
    mocks.getArtistById.mockResolvedValue(artistRow);
    mocks.findOrIngestDiscography.mockResolvedValue(discography);
    // `db.transaction` real ejecuta el callback con un `tx` de la misma forma
    // que `db` — acá reutilizamos el propio mock de `db` como `tx`, así que
    // `tx.select/insert/delete` dentro de la transacción pasan por los mismos
    // `mockReturnValueOnce` encolados para `mocks.db`.
    mocks.db.transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mocks.db));
  });

  it("activar un recorrido nuevo pre-puebla solo los álbumes de estudio", async () => {
    const { activateArtistJourney } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([])) // getJourneyRow: no existe
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds
      .mockReturnValueOnce(chain([])); // listenedReleaseGroupIds
    let insertedItems: unknown;
    mocks.db.insert
      .mockReturnValueOnce(chain([journeyRow])) // insert userList
      .mockReturnValueOnce(chain([], (values) => (insertedItems = values))); // pre-población

    const detail = await activateArtistJourney(ownerId, artistId);

    expect(detail.state).toBe("in_progress");
    expect(detail.progress).toEqual({ selectedCount: 1, listenedCount: 0 });
    expect(detail.albums.find((a) => a.id === sg1)?.selected).toBe(true);
    expect(detail.albums.find((a) => a.id === sg1)?.listened).toBe(false);
    expect(detail.albums.find((a) => a.id === sg2)?.selected).toBe(false);

    // El insert de ítems de pre-población solo debe recibir el álbum de
    // categoría studio (sg1), nunca el en-vivo (sg2).
    expect(insertedItems).toEqual([{ listId: listId, releaseGroupId: sg1, position: 1 }]);
  });

  it("activar un recorrido existente es idempotente y no vuelve a insertar", async () => {
    const { activateArtistJourney } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([journeyRow])) // getJourneyRow: ya existe
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])); // listenedReleaseGroupIds

    const detail = await activateArtistJourney(ownerId, artistId);

    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(detail.state).toBe("complete");
    expect(detail.albums.find((a) => a.id === sg1)?.listened).toBe(true);
    expect(detail.albums.find((a) => a.id === sg2)?.listened).toBe(false);
  });

  it("el detalle devuelve los álbumes ordenados por año, sin importar el orden del catálogo", async () => {
    // La discografía llega del catálogo en un orden arbitrario (por crédito,
    // no por fecha) — `buildDetail` debe reordenarla, no devolverla tal cual.
    mocks.findOrIngestDiscography.mockResolvedValueOnce([
      { id: sg2, title: "Made in Japan", category: "live_other", firstReleaseYear: 1972, coverThumbUrl: null },
      { id: "id-sin-anio", title: "Rarities", category: "compilation", firstReleaseYear: null, coverThumbUrl: null },
      { id: sg1, title: "In Rock", category: "studio", firstReleaseYear: 1970, coverThumbUrl: null },
    ]);
    const { activateArtistJourney } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([journeyRow]))
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }]))
      .mockReturnValueOnce(chain([]));

    const detail = await activateArtistJourney(ownerId, artistId);

    expect(detail.albums.map((a) => a.id)).toEqual([sg1, sg2, "id-sin-anio"]);
  });

  it("listened se calcula sobre toda la discografía, no solo la selección", async () => {
    const { activateArtistJourney } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([journeyRow])) // getJourneyRow: ya existe
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds: solo sg1
      .mockReturnValueOnce(chain([{ releaseGroupId: sg2 }])); // listenedReleaseGroupIds: solo sg2 (no seleccionado)

    const detail = await activateArtistJourney(ownerId, artistId);

    expect(detail.albums.find((a) => a.id === sg1)).toMatchObject({ selected: true, listened: false });
    expect(detail.albums.find((a) => a.id === sg2)).toMatchObject({ selected: false, listened: true });
    // sg2 no está seleccionado, así que no cuenta para el progreso agregado.
    expect(detail.progress).toEqual({ selectedCount: 1, listenedCount: 0 });
  });

  it("setJourneySelection rechaza con VALIDATION_ERROR si algún id no pertenece al artista", async () => {
    const { setJourneySelection } = await import("./artist-journeys");

    mocks.db.select.mockReturnValueOnce(chain([journeyRow])); // requireOwnedJourney

    await expect(
      setJourneySelection(ownerId, artistId, ["00000000-0000-4000-8000-000000000099"]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("setJourneySelection sin recorrido activo rechaza con ARTIST_JOURNEY_NOT_FOUND", async () => {
    const { setJourneySelection } = await import("./artist-journeys");

    mocks.db.select.mockReturnValueOnce(chain([])); // requireOwnedJourney: no existe

    await expect(setJourneySelection(ownerId, artistId, [sg1])).rejects.toMatchObject({
      code: "ARTIST_JOURNEY_NOT_FOUND",
    });
  });

  it("setJourneySelection sin cambios no abre una transacción", async () => {
    const { setJourneySelection } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([journeyRow])) // requireOwnedJourney
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds (actual)
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds (buildDetail)
      .mockReturnValueOnce(chain([])); // listenedReleaseGroupIds

    const detail = await setJourneySelection(ownerId, artistId, [sg1]);

    expect(mocks.db.transaction).not.toHaveBeenCalled();
    expect(detail.albums.find((a) => a.id === sg1)?.selected).toBe(true);
  });

  it("setJourneySelection agrega y quita en una sola transacción", async () => {
    const { setJourneySelection } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([journeyRow])) // requireOwnedJourney
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds (actual: sg1)
      .mockReturnValueOnce(chain([{ max: 0 }])) // max(position) dentro de la transacción
      .mockReturnValueOnce(chain([{ releaseGroupId: sg2 }])) // selectedReleaseGroupIds (buildDetail)
      .mockReturnValueOnce(chain([])); // listenedReleaseGroupIds
    let insertedItems: unknown;
    mocks.db.delete.mockReturnValueOnce(chain(undefined));
    mocks.db.insert.mockReturnValueOnce(chain([], (v) => (insertedItems = v)));
    mocks.db.update.mockReturnValueOnce(chain(undefined)); // touch de user_list para el trigger de updated_at

    // Pide quedarse solo con sg2: sg1 (actual) se quita, sg2 se agrega.
    const detail = await setJourneySelection(ownerId, artistId, [sg2]);

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.db.delete).toHaveBeenCalledTimes(1);
    expect(mocks.db.update).toHaveBeenCalledTimes(1);
    expect(insertedItems).toEqual([{ listId, releaseGroupId: sg2, position: 1 }]);
    expect(detail.albums.find((a) => a.id === sg1)?.selected).toBe(false);
    expect(detail.albums.find((a) => a.id === sg2)?.selected).toBe(true);
  });

  it("setJourneySelection con lista vacía quita toda la selección", async () => {
    const { setJourneySelection } = await import("./artist-journeys");

    mocks.db.select
      .mockReturnValueOnce(chain([journeyRow])) // requireOwnedJourney
      .mockReturnValueOnce(chain([{ releaseGroupId: sg1 }])) // selectedReleaseGroupIds (actual)
      .mockReturnValueOnce(chain([])) // selectedReleaseGroupIds (buildDetail): vacío
      .mockReturnValueOnce(chain([])); // listenedReleaseGroupIds
    mocks.db.delete.mockReturnValueOnce(chain(undefined));
    mocks.db.update.mockReturnValueOnce(chain(undefined)); // touch de user_list para el trigger de updated_at

    const detail = await setJourneySelection(ownerId, artistId, []);

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(detail.progress.selectedCount).toBe(0);
  });

  it("journeyStatesForArtists devuelve vacío sin consultar la base si no hay artistas", async () => {
    const { journeyStatesForArtists } = await import("./artist-journeys");
    const result = await journeyStatesForArtists(ownerId, []);
    expect(result.size).toBe(0);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("listMyArtistJourneys deriva el estado de cada fila, incluidos los archivados", async () => {
    const { listMyArtistJourneys } = await import("./artist-journeys");

    const rows = [
      {
        listId,
        artistId,
        artistName: "Deep Purple",
        artistPhotoUrl: null,
        journeyArchivedAt: null as Date | null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-03T00:00:00Z"),
      },
      {
        listId: "00000000-0000-4000-8000-000000000099",
        artistId: "00000000-0000-4000-8000-000000000098",
        artistName: "Iron Maiden",
        artistPhotoUrl: null,
        journeyArchivedAt: new Date("2026-02-01T00:00:00Z"),
        createdAt: new Date("2026-01-02T00:00:00Z"),
        updatedAt: new Date("2026-02-01T00:00:00Z"),
      },
    ];

    mocks.db.select
      .mockReturnValueOnce(chain(rows))
      .mockReturnValueOnce(
        chain([
          { listId, selected: 2, listened: 2 },
          { listId: "00000000-0000-4000-8000-000000000099", selected: 3, listened: 1 },
        ]),
      );

    const journeys = await listMyArtistJourneys(ownerId);

    expect(journeys).toEqual([
      {
        artistId,
        artistName: "Deep Purple",
        artistPhotoUrl: null,
        state: "complete",
        progress: { selectedCount: 2, listenedCount: 2 },
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
      {
        artistId: "00000000-0000-4000-8000-000000000098",
        artistName: "Iron Maiden",
        artistPhotoUrl: null,
        state: "archived",
        progress: { selectedCount: 3, listenedCount: 1 },
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ]);
  });
});
