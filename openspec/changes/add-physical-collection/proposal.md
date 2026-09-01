## Why

Favoritos y listas (Fase 5) cubren "qué me gusta" y "qué curo", pero no hay forma de
declarar y presumir el **coleccionismo físico**: qué discos tiene cada persona en vinilo,
CD o cassette. Es una señal identitaria fuerte para el público objetivo de la plataforma
(el coleccionista serio) y hoy no tiene lugar en el modelo. El catálogo no modela formato
físico —`release` es "edición" (original/remaster), no soporte— así que el formato y las
características de cada copia son 100% dato del usuario, lo que simplifica el alcance.

## What Changes

- **Entrada de colección**: nueva señal por álbum (`release_group`) con FK directa —el
  objetivo es fijo (solo álbum), no polimórfico, así que no usa el patrón
  `CHECK num_nonnulls`. Cada entrada tiene un **formato** (`vinyl`/`cd`/`cassette`/`other`),
  cero o más **atributos** de un vocabulario cerrado (`limited-edition`, `colored-vinyl`,
  `bonus-tracks`, `regional-edition`, …), una **nota** libre corta opcional, y **audiencia**
  propia (`private`/`followers`/`public`), coherente con favoritos.
- **Grano por álbum + copia**: se permiten **múltiples entradas para el mismo álbum** (mismo
  o distinto formato) —el caso "tengo el vinilo y el CD", o "dos CDs con portada distinta",
  es el canónico del coleccionismo, no un borde. No hay toggle idempotente: `POST` siempre
  crea, `DELETE` es por id de entrada.
- **Superficies**: acción autenticada en la página de álbum para agregar a la colección y
  ver/quitar las copias propias de ese álbum; página propia `/me/collection` con la colección
  en formato de lista y filtros por formato/atributo; sección pública en el perfil de usuario
  respetando audiencias y bloqueos.
- **Docs**: `01-domain/domain-model.md`, `03-data/sql-model.md`, `02-architecture/data-classification.md`,
  `04-api/contracts.md`, nuevo `05-features/physical-collection.md` + `05-features/README.md`,
  `00-product/roadmap.md` y una nueva decisión `00-product/product_philosophy.md` §6.6.

## Capabilities

### New Capabilities

- `physical-collection`: declaración de coleccionismo físico por álbum —entrada con formato,
  atributos de edición de vocabulario cerrado, nota libre y audiencia propia; múltiples
  entradas por álbum; superficie propia en formato lista con filtros, acción en la página de
  álbum y sección pública en el perfil filtrada por la matriz de visibilidad.

### Modified Capabilities

_Ninguna._ No cambia el comportamiento de `favorites`, `lists` ni `activity-feed`; la
colección es una señal independiente y su aparición en el feed queda fuera de alcance (ver
design.md, Non-Goals).

## Impact

- **Schema**: nueva migración `drizzle/0012_physical_collection.sql` con la tabla
  `collection_entry` + espejo manual en `src/db/schema.ts` (tipo `CollectionEntryRow`).
- **Servicios**: nuevo `src/services/collection/`, reutilizando `audiencesForProfile` de
  `src/services/social/visibility.ts` y los bloqueos de `src/services/social/blocking.ts`.
- **API**: nuevos endpoints bajo `/api/me/collection` y `/api/users/[username]/collection`,
  con `with-error-handling`, `await params` (Next 15) y validación Zod.
- **UI**: acción en la página de álbum (`src/components/catalog/`), página `/me/collection`,
  sección en el perfil de usuario; i18n es/en; navegación autenticada.
- **Sin cambios** en `catalog/`, `musicbrainz/`, `cover-art.ts` ni en los contratos REST
  existentes.
