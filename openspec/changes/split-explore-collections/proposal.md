## Why

El riel "Colecciones destacadas" de `/explore` mezcla dos cosas distintas: la **selección editorial** (humana,
subjetiva: mejores debuts, discos de culto, un ranking según una revista) y las **colecciones automáticas**
(efemérides, premios, curiosidades de datos, y más adelante comportamiento de la comunidad). Meterlas en seis
tarjetas obliga a que compitan por el mismo espacio y esconde lo que más valor da a Explorar: que las
posibilidades son prácticamente infinitas. Hay que separarlas, darles identidad propia y una página donde
explorarlas todas, incluido el archivo de las que ya vencieron.

## What Changes

- **Dos riles en `/explore`:**
  - **Selección editorial** — las colecciones curadas (`source='curated'`), subjetivas. Se oculta mientras no
    haya ninguna publicada.
  - **Descubre por datos** (nombre provisional) — las generadas por plantilla (`source='template'`). El nombre es
    neutro a propósito: no todas son de "hoy" (Ganadores del Grammy no lo es); "Hoy en la música" queda reservado
    para una futura sección de efemérides de personas.
- **Cada rail con su propio tope** (6) y su propio orden; ambos con "Ver todas →" a la página dedicada.
- **Familia de colección** para cada plantilla (`ephemeris`, `awards`, `releases`, `discovery`, `community`),
  definida en el registro de plantillas: etiqueta en la tarjeta y filtro en la página dedicada. Sin migración.
- **Página propia `/explore/colecciones`** (no se fusiona con Listas): selección editorial vigente, colecciones
  automáticas vigentes agrupadas por familia y **archivo** de las vencidas (ya se conservan, públicas y por URL),
  paginado y filtrable por familia.
- **Consola `/admin`:** el panel "Destacadas en Explorar" se divide en dos grupos con orden independiente;
  `PUT /featured/order` recibe el grupo (`curated` | `automatic`) y el estado "dentro del tope" se calcula por
  grupo.
- **`/lists` → Destacadas** pasa a mostrar solo lo editorial (oficiales y curadas); las colecciones automáticas
  son de Explorar. Las curadas siguen en ambas puertas, sin duplicar datos.
- La navegación rápida de `/explore` suma los dos riles; la Inicio anónima conserva su riel (no cambia).

## Capabilities

### New Capabilities
- `explore-collections-hub`: la página `/explore/colecciones` (vigentes por familia, selección editorial,
  archivo y filtro) y las familias de colección.

### Modified Capabilities
- `album-discovery`: la sección "Colecciones destacadas" se separa en "Selección editorial" y "Descubre por
  datos", con orden de secciones, topes y visibilidad propios.
- `explore-featured-management`: panel e interacción de orden por grupo.
- `community-lists`: la sección "Destacadas" de `/lists` excluye las colecciones automáticas.

## Goals / Non-Goals

**Goals:**
- Dos identidades claras (editorial frente a automática) sin duplicar datos ni migrar.
- Un lugar para recorrer todas las colecciones, incluido su archivo.
- Que agregar plantillas nuevas (premios por género, curiosidades, efemérides) no cambie la portada.

**Non-Goals:**
- Plantillas nuevas (premios por género, curiosidades del catálogo, efemérides de artistas): cambios siguientes.
- Sección de cumpleaños y homenajes a fallecidos (requiere datos de vida de artistas y criterio de tono).
- Contenido o curaduría de la selección editorial (lo escribe el equipo desde `/admin`).
- Cambiar la Inicio anónima ni el tope de 6 por rail.
- Personalización por afinidad.

## Impact

- Código: `src/services/discovery/discovery.ts` (lecturas por grupo y archivo), `collections/families.ts` (nuevo),
  `featured.ts` (orden por grupo), `src/services/lists/community.ts`, `explore/page.tsx`, nueva
  `explore/colecciones/page.tsx`, `CollectionRail` / nueva grilla, `ExploreJumpNav`, `FeaturedPanel`, rutas
  `PUT /api/admin/editorial/featured/order`, `messages/{es,en}`.
- Contrato: `PUT /featured/order` exige `group`; `GET /featured` expone `group`. Se documenta en `contracts.md`.
- Docs: `explore.md`, ADR 0036, `AGENTS.md` (smoke test ampliado).
- Sin migraciones ni dependencias nuevas.
