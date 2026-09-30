# ADR 0022 — Direcciones públicas con `slug-<id>` en base58

## Estado

Aceptado (cambio `add-catalog-slugs`, 2026-09).

## Contexto

Las direcciones públicas del catálogo usaban el UUID interno pelado
(`/es/artist/93f1f6be-b1dc-42d0-abde-2850072d0774`): 36 caracteres opacos que no dicen de qué
artista, disco o canción son, ni al compartirlas ni en la barra del navegador. El ADR 0007 fijó
que los segmentos fijos de ruta son neutros en inglés y no se traducen; el segmento dinámico
seguía siendo el UUID.

El catálogo se crea bajo demanda en la ingesta (ADR 0011, con artistas stub), así que una
columna `slug` única obligaría a resolver carreras de escritura y a un backfill, y los títulos
("Intro", "Greatest Hits") colisionan de forma masiva. No hay enlaces de catálogo persistidos en
la base ni migraciones de datos que hacer.

## Decisión

1. **Segmento `<slug>-<id>` con el id como verdad y el slug decorativo.** El nombre del parámetro
   dinámico no cambia (`[id]`, `[reviewId]`, `[listId]`); solo su valor. El slug se calcula al
   renderizar a partir del nombre y **no se guarda**: no hay columna, ni unicidad, ni tabla de
   historial. Dos artistas homónimos comparten slug y los separa el id.

2. **El id es el UUID de 128 bits codificado en base58 de Bitcoin** (sin `0`, `O`, `I` ni `l`),
   relleno a la izquierda con `1` hasta exactamente 22 caracteres, de modo que cada UUID tenga una
   única forma canónica. Implementación propia sobre `BigInt` en `src/lib/slug.ts`, sin
   dependencias nuevas. La decodificación exige longitud 22, alfabeto válido y valor menor que
   2^128.

3. **El slug se deriva del nombre**: artista → `slugify(nombre)` a 30 puntos de código; álbum y
   canción → `<slugify(artista principal) 30>-<slugify(título) 60>`, con el primer crédito
   `primary` por `position` (los `featured` no entran); lista → `slugify(nombre)` a 60; reseña →
   `slugify(usuario)-slugify(título del álbum)`. `slugify` conserva las letras Unicode (no
   translitera), quita los diacríticos latinos y los apóstrofos, y no deja guiones al inicio ni al
   final. Si el slug queda vacío, el segmento es solo el id.

4. **Canonicalización con 308 en cada página.** Cada página pública carga la entidad por el id del
   segmento y, si el segmento recibido (decodificado y en NFC) no es el canónico, responde un
   `308` a la dirección canónica conservando el locale, la subruta de pestaña y todo el query.
   `permanentRedirect` (y no temporal) porque el formato viejo y los slugs desactualizados no van
   a volver; el alias de usuario de `redirectIfRenamed` sigue siendo temporal por su reserva de 30
   días.

5. **Un único módulo de parseo y un único juego de helpers.** `parseCatalogSegment` reemplaza a
   `isValidUuid` en todas las páginas y layouts del catálogo. `src/lib/catalog-links.ts` exporta
   `artistHref`, `albumHref`, `songHref`, `listHref` y `reviewHref`; álbum y canción exigen el
   nombre del artista principal (`string | null`, sin valor por defecto) para que el compilador
   obligue a decidir en cada sitio. Un test de cumplimiento falla si aparece un enlace armado a
   mano fuera de los helpers.

6. **Compatibilidad permanente con el UUID.** Las direcciones con el UUID hexadecimal pelado
   siguen resolviendo indefinidamente, siempre mediante el `308`. La API (`/api/**`) no cambia:
   sigue recibiendo y devolviendo el UUID interno.

## Alternativas consideradas

- **Columna `slug` única con historial** (URLs sin sufijo): exige backfill, unicidad con
  desambiguador y manejo de carreras en la ingesta bajo demanda; canciones y álbumes colisionan
  masivamente. Descartada por costo y riesgo.
- **UUID completo como sufijo** (36 caracteres): robusto pero más largo que lo que se quiere
  acortar.
- **Prefijo hexadecimal corto** (12 caracteres): corto, pero exige buscar por rango en la PK y
  desempatar colisiones. Base58 es corto, sin pérdida y sin colisiones.
- **Transliterar escrituras no latinas**: suma dependencias y pierde información; se conservan
  tal cual (`кино`, `宇多田ヒカル`, `방탄소년단`).

## Consecuencias

- **Base58 distingue mayúsculas**: un enlace pasado a minúsculas da 404 y **nunca** resuelve a
  otra entidad. Se acepta y se documenta.
- **Homónimos**: el slug de dos artistas con el mismo nombre es idéntico; los separa el id y la
  página ya muestra la desambiguación de MusicBrainz. Mejora futura (slug único solo para
  artistas, con el id como respaldo) sin romper este formato, porque el parseo ya distingue "solo
  id" de "slug-id".
- **Un enlace sin artista principal cuesta un `308` extra**: `artistName` obligatorio en el tipo y
  servicios ampliados para traerlo; el `308` es una red de seguridad, no el camino normal. Donde
  el artista no está en la proyección se pasa `null` y el salto es aceptable.
- **Renombres o cambios del crédito principal**: el slug cambia, pero el id no, así que ningún
  enlace queda huérfano; los viejos redirigen.
- **Sin cambios de esquema ni migraciones**: el formato es puramente de presentación. Revertir
  solo los helpers de enlace devuelve el formato viejo sin romper nada, porque el UUID sigue
  siendo válido.
- **Las páginas que canonicalizan no pueden tener `loading.tsx` por encima.** Un `loading.tsx`
  abre una frontera de Suspense: la respuesta empieza a streamearse (HTTP 200) y el redirect/404
  se entrega dentro del stream como redirect del cliente, en vez de un `308`/`404` real. Por eso
  se quitaron los `loading.tsx` de `artist/[id]`, `album/[id]` (incluida la pestaña Reseñas) y
  `song/[id]`, y un test (`catalog-route-pages.test.ts`) falla si se vuelve a agregar uno. Las
  listas y reseñas nunca tuvieron uno y devuelven el `308` real. Es una limitación conocida de
  Next.js App Router (issues #74921, #84196), no un error de esta implementación.
- El ADR 0007 no se reescribe: sigue vigente que los segmentos fijos de ruta son neutros en
  inglés; este ADR solo define el valor del segmento dinámico.
