## Why

El análisis de rendimiento del buscador (2026-11-02, servidor de producción local contra la base de
scratch: 30.8k artistas, 62.9k álbumes, 23k grabaciones) mostró que lo propio es rápido (la página
responde en 20–40 ms y las sugerencias en 8–50 ms) y que casi toda la espera viene de MusicBrainz
(1 solicitud cada 1.1 s, 0.3–3 s cada una) y de unos pocos puntos evitables:

- **Canciones** tarda 5–15 s en frío: tras la búsqueda de recordings se hacen hasta 4 *browse* de
  apariciones (`/release?recording=`) en serie, uno por turno de la cola. La propia búsqueda de
  recordings ya trae **todas** las ediciones de cada grabación con su release-group (verificado:
  130 ediciones de *Creep* en la búsqueda frente a una página de 100 en el browse), así que esos
  browse sobran.
- **Artistas** no muestra nada hasta que responde MusicBrainz (1–3 s), aunque el artista esté en
  la base: la sección espera la búsqueda completa para decidir la redirección por coincidencia
  exacta única.
- El **formulario avanzado** no da ninguna señal al enviarse: la página queda igual entre 0.4 y
  2 s y parece que no pasó nada. El envío del Header tampoco la da en la variante compacta.
- El **desplegable** se vacía en cada tecla hasta que llega la respuesta nueva: parpadea con cada
  letra.
- **SQL de más:** cada búsqueda de Álbumes vuelve a guardar los créditos de discos ya conocidos
  (17 inserts y 19 selects, también en caliente: 42 consultas, 100–215 ms); la sugerencia
  «soda st» hace una consulta por cada artista llamado «Soda» (26 consultas); y la coincidencia
  difusa sobre títulos con palabras comunes («the d») recorre 16k candidatos (170–245 ms) cuando la
  coincidencia por subcadena ya da de sobra (15 ms).

## What Changes

- **Canciones:** las apariciones de cada grabación de MusicBrainz salen de la propia búsqueda de
  recordings (ediciones con su release-group embebido). Se elimina el browse de apariciones de la
  búsqueda: Canciones pasa de hasta 6 solicitudes a MusicBrainz a como mucho 3 (artistas, un browse
  de discografía solo sin créditos locales, recordings), sin perder apariciones.
- **Artistas:** la página muestra primero las coincidencias locales y transmite por streaming el
  resultado fusionado con MusicBrainz, como Álbumes y Canciones. La redirección por coincidencia
  exacta única se conserva: la decide la parte transmitida, cuando MusicBrainz confirma que no hay
  homónimos (la persona puede ver la lista local un instante antes del salto).
- **Señal de carga al enviar:** el formulario avanzado y el buscador del Header marcan el envío en
  curso (botón deshabilitado y resultados anteriores atenuados con `aria-busy`) hasta que llega la
  página nueva.
- **Desplegable estable:** mientras llega la respuesta de la consulta nueva, el desplegable
  conserva las sugerencias anteriores (marcadas como pendientes) en vez de vaciarse.
- **SQL:** los créditos de los álbumes de MusicBrainz solo se guardan para los stubs recién
  creados, en lote; el puente artista + título de las sugerencias hace una consulta por resto de
  título, no por artista; la coincidencia local de nombres y títulos busca primero por subcadena y
  solo usa la similitud por trigramas cuando la subcadena no llena el cupo de candidatos.
- Presupuestos de tiempo medibles sobre la base de scratch para las sugerencias de Artistas y
  Álbumes y para la búsqueda de Álbumes en caliente.

## Goals

- Canciones en frío en 3 s o menos en los casos medidos (hoy 5–15 s), con las mismas apariciones o
  más.
- Artistas: lo local visible en unos 100 ms en `/search` y `/search/advanced`.
- Ningún envío de búsqueda sin señal visible de que está en curso.
- Sugerencias de Artistas y Álbumes en 40 ms o menos (mediana) cuando la subcadena llena el cupo
  (palabras comunes) y en el puente con homónimos; el resto, no más lentas que antes.
- Búsqueda de Álbumes en caliente con un número de consultas SQL acotado que no crece con los
  resultados de MusicBrainz.

## Non-Goals

- Cambiar el límite de 1 solicitud por segundo a MusicBrainz, la caché TTL de búsquedas ni la
  latencia propia de MusicBrainz (0.3–3 s por solicitud).
- Cambiar el contenido de las páginas de artista, álbum o canción (la ingesta de discografía de la
  primera visita a un artista, ~4.7 s, queda fuera).
- Reducir el JavaScript inicial de la página (267 KB en la portada).
- Nuevos campos de la búsqueda avanzada (los campos solo del catálogo siguen pendientes).
- Cambiar el orden de los resultados o de las sugerencias más allá de lo que exige la coincidencia
  por subcadena primero.

## Capabilities

### New Capabilities

<!-- Ninguna: todo cae en capacidades existentes del buscador. -->

### Modified Capabilities

- `catalog-search`: Canciones resuelve apariciones desde la búsqueda de recordings (sin browse);
  nuevo presupuesto de MusicBrainz para Canciones; Artistas pasa a local primero con streaming y
  redirección desde la parte transmitida; señal de envío en curso también en el formulario avanzado
  y el Header; créditos de stubs de álbum solo para los nuevos y en lote.
- `search-typeahead`: el desplegable conserva las sugerencias anteriores mientras carga; presupuesto
  de tiempo para las sugerencias de Artistas y Álbumes (incluido el puente artista + título).
- `search-query-matching`: la coincidencia local por nombre o título usa la subcadena primero y la
  similitud por trigramas solo como relleno.

## Impact

- **Código:** `src/services/catalog/search/{songs,artists,albums,suggest,local-match}.ts`,
  `src/services/musicbrainz/types.ts` (ediciones embebidas en la búsqueda de recordings),
  `src/services/catalog/ingest-discography.ts` (`ingestCredits` en lote o una variante),
  `src/app/[locale]/(catalog)/search/sections.tsx`, `src/components/catalog/ScopedSearchField.tsx`,
  `src/components/catalog/advanced-search/AdvancedSearchForm.tsx`.
- **MusicBrainz:** menos solicitudes por búsqueda de Canciones; `browseReleasesByRecording` deja de
  usarse en la búsqueda (sigue disponible en el cliente si otro flujo lo necesita).
- **API:** sin cambios de contrato en `/api/catalog/search` ni `/api/search/suggest`.
- **Base de datos:** sin migraciones.
- **Docs:** `docs/05-features/catalog-browsing.md` (presupuesto y streaming de Artistas),
  `docs/04-api/contracts.md` solo si cambia la descripción del presupuesto por tipo.
