## Why

La página de artista va a tener una pestaña Integrantes al estilo de Metal-Archives
(`add-artist-members-tab`): alineación completa, actual, antiguos y músicos de apoyo, con las
otras bandas de cada integrante para seguir navegando. El modelo actual no alcanza. Una
verificación en vivo con Mötley Crüe (2026-09-28) mostró que MusicBrainz entrega 14
relaciones de pertenencia con períodos separados (Vince Neil: 1981–1992, 1997–2015,
2018–presente), instrumentos por período, la marca de integrante fundador (`original`) y 6
músicos de apoyo, pero `membership` guarda una fila por persona y grupo con las fechas
fusionadas (Vince Neil queda "1981–presente"), mezcla `original` con los instrumentos en el
texto del rol, descarta a los músicos de apoyo y nunca vuelve a sincronizar (John 5, que
entró en 2022, falta si la banda se visitó antes).

## What Changes

- **Períodos de pertenencia**: una fila por relación de MusicBrainz, con fechas parciales,
  si terminó, instrumentos crudos y las marcas fundador (`original`) y adicional
  (`additional`) separadas de los instrumentos. `membership` sigue siendo el par persona ↔
  grupo, con su resumen (rol y fechas) derivado de los períodos para no romper a quienes lo
  leen (discografía de una persona, niveles de créditos, API del artista).
- **Músicos de apoyo**: las relaciones de MusicBrainz de apoyo instrumental, vocal y genérico,
  de una persona a cualquier artista (grupo o solista, p. ej. la banda de gira de un
  solista), con períodos e instrumentos. MusicBrainz no distingue en vivo de estudio ("en
  álbumes y/o en conciertos"), así que se guardan como apoyo, sin inventar la distinción.
- **Clasificación de la alineación** como función pura: actuales, antiguos, "Última
  alineación" de un grupo separado, apoyo actual y anterior, con período desconocido cuando
  MusicBrainz no trae fechas.
- **Actualización de la alineación** cada 30 días, en la misma request que ya renueva la
  ficha del artista (sin requests extra).
- **Sincronización de integrantes en segundo plano**: al mostrar la alineación de un grupo, se
  sincronizan los integrantes y músicos de apoyo pendientes o vencidos (su ficha y sus
  pertenencias, una request por persona, sin Wikimedia), con un tope por visita. De ahí salen
  las otras bandas de cada integrante y su fecha de muerte.
- **Lectura de la alineación** para la interfaz: integrantes y apoyo con sus períodos, marcas,
  fecha de muerte y otras bandas; nunca consulta MusicBrainz.
- Backfill de períodos y apoyo para los artistas ya sincronizados.

## Capabilities

### New Capabilities

- `artist-lineup`: períodos de pertenencia, músicos de apoyo, clasificación de la alineación,
  sincronización de integrantes en segundo plano y lectura para la interfaz.

### Modified Capabilities

- `catalog-artist`: la sincronización fría de pertenencias guarda también períodos y apoyo.
- `artist-profile-facts`: la actualización cada 30 días renueva también la alineación.

## Impact

- **Esquema**: migración `0055`: tabla de períodos de pertenencia, tabla de apoyo, marca de
  sincronización de la alineación. Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`.
- **MusicBrainz**: ninguna request nueva; `getArtistWithRelations` ya trae `artist-rels`. El
  mapper amplía los tipos de relación que lee.
- **Catálogo**: `ingest-artist.ts` (sincronización), `artist-profile.ts` (actualización),
  servicio nuevo de alineación. La cola de MusicBrainz es global al proceso: el tope por
  visita acota cuánto espera una ingesta en primer plano detrás de la sincronización de
  integrantes.
- **API**: `GET /api/catalog/artist/{id}` mantiene la forma de `memberships`; `role` deja de
  incluir las marcas `original` y `additional` (`docs/04-api/contracts.md`).
- **Docs**: `domain-model.md` (pertenencia con períodos, músico de apoyo),
  `business-rules.md` (clasificación de la alineación).
- La interfaz (pestaña, cabecera) queda en `add-artist-members-tab`.
