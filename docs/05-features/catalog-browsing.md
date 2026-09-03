# Catálogo navegable — buscar → artista → álbum

**Fase:** 3 (roadmap). **Estado:** especificado, backend completo y validado — ver
`02-architecture/frontend-plan/` para la implementación de frontend en curso.

Este documento describe el comportamiento del feature desde la perspectiva del producto:
qué ve y qué puede hacer un usuario, en qué estados, y qué casos límite existen. El
contrato técnico exacto vive en `04-api/contracts.md`; las reglas de negocio subyacentes
(identidad de artista, remaster vs. versión nueva, ediciones) en `01-domain/business-rules.md`.

## Alcance de la Fase 3

Solo lectura, sin cuenta de usuario. El flujo completo:

```
Buscar en el catálogo → Resultados → Perfil de artista / Álbum (tracklist + créditos)
```

La vista de detalle de canción queda deliberadamente fuera de esta fase (Camino A,
`02-implementation-plan.md`, Etapa 3.5) — se construye en Fase 4 junto al formulario de
valoración, para no reescribir la misma pantalla dos veces.

## 1. Buscar en el catálogo

El usuario escribe un texto y `/search` muestra **todas** las coincidencias de artistas y
álbumes (pestañas **Todo / Artistas / Álbumes**); la persona elige cuál abrir. La búsqueda
no resuelve a un único resultado ni ingiere nada: combina la base local con una sola
request a MusicBrainz por tipo, persiste los candidatos aún no vistos como stubs y ordena
de forma determinista (locales cacheados → resto de locales → solo-MusicBrainz por score,
coincidencia exacta al tope de su grupo). El campo del Header siempre navega a
`/search?q=<consulta>`.

**Estados:**
- **Resultados** — lista de candidatos; cada fila enlaza directo a `/artist/<id>` o
  `/album/<id>`. Un artista o álbum todavía no ingerido se trae **en la vista destino**,
  con su propio estado de carga — la página de resultados nunca habla de "primera
  importación".
- **Sin coincidencias** — lista vacía (`200`, no error): estado vacío propio.
- **Carga** — mientras la página resuelve el `q` de la URL, `loading.tsx` muestra el
  skeleton de la lista y el formulario queda deshabilitado.
- **Error** — solo si MusicBrainz falla y no hay ninguna coincidencia local
  (`INTERNAL_ERROR`): recuperable, con reintento. Distinto de "sin coincidencias".

Los homónimos ("Poison" glam vs. thrash) aparecen como filas separadas con su
disambiguation — la ambigüedad la resuelve el usuario, no `artists[0]`. Búsqueda de
canciones, autocompletado y paginación: diferidos (ver el roadmap y
`openspec/changes/add-search-results-page/design.md` → *Trabajo futuro diferido*).

## 2. Perfil de artista

Foto, nombre, biografía breve (si existe), y discografía agrupada en cuatro categorías
fijas: **De estudio**, **Singles/EP**, **Compilados**, **En vivo / Misceláneos** — el
diseño ya definido en la visión de producto.

**Caso Roger Waters / Pink Floyd (referencia del proyecto):** el perfil de un artista
muestra tanto su discografía como banda como su carrera solista en la misma pantalla, sin
distinguir "modo banda" de "modo solista" — es una sola discografía agrupada por
categoría, el hecho de que algunos álbumes sean con una banda y otros en solitario no
cambia la estructura de la pantalla. Ver ADR 0004 (modelo `CREDIT`) para el porqué.

**Artista sin discografía todavía cacheada:** la búsqueda ya no ingiere nada — abre un
artista recién descubierto (stub creado por la búsqueda o por créditos de `feat.`)
dispara `findOrIngestDiscography` en el request que resuelve esta pantalla, con el estado
de carga propio del perfil. Desde la página de resultados, el aviso de "primera
importación" corresponde acá, no a la búsqueda.

**Carátulas:** carga progresiva (lazy) — la grilla de álbumes se renderiza de inmediato
sin carátula, y cada álbum completa la suya en segundo plano apenas es visible. Decisión
ya tomada (Opción C, `00-backend-analysis.md`); nunca bloquear el render inicial de la
página esperando carátulas.

## 3. Detalle de álbum

Tracklist completo de la edición "oficial" (o la primera disponible), con posición,
título, duración (`mm:ss`), carátula, y créditos por canción.

**Créditos (`feat.`):** cada canción con colaboración muestra el crédito reconstruido
(ej. "Pink Floyd feat. Roger Waters"), enlazado al perfil del artista credited. Un track
sin créditos adicionales (el caso normal) no muestra nada extra — el crédito solo aparece
cuando aporta información sobre-y-encima del artista principal del álbum.

**Álbum sin ediciones ingeribles:** MusicBrainz no tiene ninguna `release` utilizable para
ese `release_group`. Estado vacío claro, no una pantalla en blanco ni un error genérico
(`NO_EDITIONS_FOUND`).

**Ediciones alternativas (japonesa, remaster, deluxe):** fuera de alcance de la Fase 3 —
se ingiere y muestra una sola edición por álbum (simplificación documentada en
`ingest-release.ts` y `sql-model.md`). El selector de edición es una función futura, no
decidida todavía.

## 4. Navegación por membresías (banda → integrantes) — diferida a Fase 4

**Problema detectado en la Etapa 3.6.** Los créditos del tracklist solo hacen navegables a los
artistas con rol `featured` (colaboraciones). En un álbum de una banda, los integrantes —p. ej.
Roger Waters en un álbum de Pink Floyd— **no figuran como `featured`** en MusicBrainz: el
`artist-credit` de cada canción es únicamente la banda. Por eso no existe un enlace desde el
álbum hacia el perfil del integrante. Se verificó con datos reales: Roger Waters tiene **0
créditos `featured`** en toda la base. Además, la discografía del perfil
(`findOrIngestDiscography`) solo incluye álbumes donde el artista aparece directamente en el
`artist-credit`, así que tampoco muestra los álbumes de las bandas a las que pertenece la persona.
Como consecuencia, el caso de referencia del proyecto ("doble discografía solista y de banda") no
queda completo con los créditos de canción.

**Solución implementada.** Implementar la navegación por membresía usando la tabla `membership`
(persona ↔ grupo, ver `03-data/sql-model.md`):

- El perfil de un **grupo** muestra a sus integrantes, con enlaces a cada perfil de persona.
- El perfil de una **persona** muestra su discografía solista **y** la de los grupos a los que
  pertenece, en la misma pantalla y agrupada por categoría — exactamente lo que define
  `01-domain/domain-model.md` y el ADR 0004.
- La consulta de discografía por membresía **completa** a `findOrIngestDiscography`, no lo
  reemplaza: se conserva el patrón de cacheo bajo demanda y no se añaden llamadas extra a
  MusicBrainz para resolver la pertenencia (la relación vive en la base propia).

La primera visita a un artista con `memberships_synced_at` nulo solicita sus `artist-rels` una sola
vez, filtra `member of band`, consolida roles y fechas conocidas, y persiste la relación de forma
idempotente. La ingesta ocurre antes de leer memberships y antes de componer la discografía. La
sincronización se ejecuta en una transacción con lock por artista: reconcilia relaciones ausentes sin
afectar memberships de otros artistas y marca el flag solo al terminar. Si la llamada externa falla,
la transacción revierte y la marca permanece nula para permitir reintentar; una lectura ya sincronizada
es exclusivamente local.

Esta extensión pertenece a Fase 4, acompaña el trabajo sobre las vistas de artista/álbum/canción y
no depende de autenticación.

## Casos límite conocidos (heredados del modelo de datos)

- **Re-grabación, remix o versión en vivo** de una canción aparecen como una entrada
  separada en el tracklist de su propio álbum — nunca se fusionan con la canción original,
  ni siquiera visualmente (son `RECORDING` distintos por diseño, ver `business-rules.md`).
- **Remaster de audio** de una canción existente **no** genera una entrada nueva en
  ningún listado — es la misma canción, mismo `RECORDING`, sin importar la edición.
- **Artista credited aún no visitado** (`type = 'unknown'`): si un usuario llega al perfil
  de un artista que solo existía como stub de un crédito ajeno, se enriquece automáticamente
  antes de responder — nunca debería verse un perfil con datos "a medias" en pantalla.

## Fuera de alcance de este documento

Valoración, comentarios, listas, favoritos y actividad social — ver
`ratings-and-reviews.md`, `lists-and-favorites.md` y `activity-feed.md` (Fases 4-5).

## Internacionalización (i18n)

El catálogo navegable soporta múltiples idiomas (español e inglés inicialmente). La
internacionalización aplica únicamente al *chrome* de la interfaz — etiquetas de UI,
botones, mensajes de estado y error. Los datos del catálogo musical (nombres de artistas,
títulos de álbumes/canciones, biografías) **no se traducen** y se muestran tal cual
llegan de MusicBrainz. Ver `02-architecture/i18n.md` para la arquitectura completa.
