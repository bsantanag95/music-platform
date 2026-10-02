## Context

Tras `add-genre-taxonomy` existen: la tabla `genre` (slug único en inglés, `name`, `name_es`, `kind`), `genre_relation`
(`subgenre_of`, `fusion_of`, `influenced_by`), `genre_family_member`, las semillas por artista y álbum y la vista
`release_group_effective_genre` (propias o 3 primeros del artista, con `inherited`). `src/services/genres/` ya tiene
`read.ts` (nombres, subgéneros por CTE, descriptores en lote), `names.ts` (puro) y el slug estable. Las URLs de
catálogo usan `slug-<id>` (ADR 0022) y los segmentos fijos son neutros en inglés (ADR 0007); el género usa su slug
guardado (ADR 0023). La identidad guarda `app_user.genres TEXT[]` (≤5) con claves validadas en la aplicación.

## Goals / Non-Goals

**Goals:** mostrar y enlazar géneros en artista, álbum y canción; página de género; selector abierto con validación;
marca declarado/real. **Non-Goals:** votos, página de familia, edición de géneros, cambios de taxonomía o herencia.

## Decisions

### D1. Una sola lectura por entidad, en lote y sin N+1

`src/services/genres/display.ts` expone `getArtistGenres(artistId)`, `getAlbumGenres(releaseGroupId)` y
`getSongGenres(recordingId)`, todas devolviendo `{ genres: DisplayGenre[], descriptors: DescriptorKey[] }` con
`DisplayGenre = { slug, name, nameEs, inherited }` en orden de posición. Artista: sus semillas de estilo (hasta 8 en
la lectura; la interfaz muestra 5 y un "+N" desplegable). Álbum: la vista efectiva (estilo) más
`albumDescriptors` (que ya existe). Canción: los del **álbum principal** que la página ya calcula ("disco principal
de la canción"), marcados como del álbum; sin disco principal o sin géneros, nada. Los ocultos nunca salen
(la vista y la consulta del artista ya los excluyen).

### D2. Un componente `GenreChips` de servidor

`GenreChips({ genres, descriptors, max, inheritedLabel })`: chips pequeños con el nombre localizado
(`genreDisplayName` + `genreLocaleOf`), enlace a `genreHref(slug)` y, si `inherited`, estilo atenuado y
`title`/texto accesible "Heredado de {artista}". Los descriptores van en otra fila, sin enlace, con borde punteado.
Se omite por completo sin géneros ni descriptores (regla de "zona sin datos no se renderiza").
- *Decisión sobre la herencia:* se **marca** en álbum y canción (atenuado + `title`) y no en el artista, donde todo es
  propio. Es una pista, no un aviso: no ocupa una línea aparte. *Alternativa: no marcarla* — esconde que el dato es
  una suposición, justo donde la cobertura es peor (singles, vivo).
- *Ubicación:* en la identidad de cada cabecera, debajo del título (álbum, canción) y de la descripción (artista), para
  no tocar el panel "Tu relación" ni la ficha técnica.

### D3. Página de género en `/genre/[slug]`

Segmento fijo en inglés `genre` (ADR 0007) y parámetro `slug` del ADR 0023 (`await params`). Server Component:

```
  Rock progresivo                       ← genreDisplayName
  Familias: [Rock]  → /explore?familia=rock
  Subgénero de: rock
  Subgéneros: avant-prog · symphonic prog …          (enlaces a /genre/<slug>)
  Cercanos: fusión de … · influido por …              (hasta 8, sin duplicar los anteriores)
  Artistas      ← top por álbumes con el género o subgéneros en el catálogo (12)
  Álbumes       ← listAlbumsByGenre (mismo orden y paginación que Explorar)
```

- Subgéneros, padres y cercanos salen de `genre_relation` (solo estilos visibles). Artistas: `artist_genre_seed` del
  género o de sus descendientes, ordenados por cantidad de álbumes acreditados (desempate por nombre). Sin artistas
  o sin álbumes la sección se omite; si no hay ninguno, un estado vacío ("Todavía no hay música de este género
  en el catálogo").
- Slug inexistente, mal formado, oculto o descriptor → `notFound()`. Slugs válidos en mayúsculas redirigen (308) al
  canónico en minúsculas, como el resto de las páginas con slug.
- Los álbumes **paginan con `?page=`** (server-side) reutilizando `listAlbumsByGenre`; no hay endpoint.
- *Alternativa: página de familia propia.* Descartada por alcance: Explorar ya lista por familia y el género enlaza a ella.

### D4. Búsqueda de géneros

`searchGenres(query, locale, limit = 20)`: estilos visibles cuyo `name` o `name_es` contiene el texto sin
tildes ni mayúsculas (`search_normalize`, ya existente, migración 0050). Orden: coincidencia exacta, prefijo, resto;
dentro, más usados (álbumes efectivos) y después nombre. Texto de 1–60 caracteres; vacío devuelve los 12 más
usados (sugerencias iniciales). `GET /api/genres/search?q=&locale=` público, con `withErrorHandling`, valida con Zod y
devuelve `{ genres: [{ slug, name, nameEs }] }`. Son ~2.200 filas: un scan es suficiente, sin índice nuevo.

### D5. Validación de la identidad contra la taxonomía

`GENRES` (22 claves) deja de ser el vocabulario. El esquema Zod valida **formato** (`GENRE_SLUG_PATTERN`, ≤5, sin
repetidos) y el servicio `updateMusicIdentity` valida **existencia**: todos los slugs deben ser géneros de estilo
visibles (`kind = 'style'`); si alguno no, `400 VALIDATION_ERROR` sin cambiar nada. `GENRES` pasa a ser solo la lista de
sugerencias iniciales del selector. Lectura: los slugs guardados que ya no son estilos visibles (género retirado u
oculto) **se ignoran al mostrar** y no se reescriben; `identityGenreLabels` los omite en lugar de caer al slug.
- *Alternativa: tabla `user_genre` con FK.* Más integridad pero migración y reescritura de lecturas por poco valor: el
  máximo es 5 y los retiros son raros. Descartada.

### D6. Selector `GenreMultiSelect`

Cliente: campo de búsqueda con debounce de 200 ms (TanStack Query, `apiFetch` con esquema Zod, como el resto), lista
de resultados accesible (`role="listbox"`, navegación con flechas, Enter agrega), chips de los elegidos con quitar y
contador "n de 5". Con el campo vacío ofrece los 12 más usados. Reemplaza el `ChipGroup` de géneros en
`OwnerMusicIdentityEditor` (roles y formatos siguen igual). Las etiquetas de los ya elegidos llegan del servidor
(`identityGenreLabels`), las de resultados vienen en la respuesta.

### D7. Declarado frente a real en la huella

`getTasteFingerprint` resuelve las familias de los géneros declarados del dueño (solo si el perfil es accesible, igual
que la Placa) y devuelve en cada punto de la cresta `declared: boolean` y, aparte, `declaredMissing: FamilyKey[]` (familias
declaradas sin presencia en la cresta). La interfaz marca las filas declaradas ("★ declarado", texto accesible) y debajo
lista las ausentes ("Dices que te mueve Jazz, pero no aparece en lo que calificas"). Sin géneros declarados no hay marcas.
*Alternativa: gráfico doble.* Descartada: más superficie para la misma lectura.

## Risks / Trade-offs

- [Cobertura baja en álbumes pequeños] → sin géneros no hay zona; la herencia ya cubre al artista con semillas.
- [Slugs de identidad que MusicBrainz retire] → se ignoran al mostrar; la persona los ve desaparecer en la ficha, no un error.
- [Consulta de artistas del género sobre subárbol grande ("rock")] → límite 12, índices ya existentes por `genre_id`; verificar
  con el catálogo de prueba.
- [Mucho ruido visual en cabeceras] → máximo 5 chips + "+N", herencia atenuada y descriptores en una fila aparte.
- [`PUT` acepta más claves] → cambio de contrato documentado; clientes solo envían slugs que el selector devolvió.

## Migration Plan

Sin migración de datos: `app_user.genres` ya guarda slugs de la taxonomía. Despliegue directo; la lista de 22 deja de
validar y pasa a validar contra la tabla `genre` (requiere la taxonomía cargada, ya requisito del cambio anterior).

## Open Questions

- ¿Mostrar el conteo de álbumes en cada chip de subgénero de la página de género? Se decide al implementar la UI.
- ¿Orden de "Cercanos": fusión primero o influencias primero? Propuesta: fusión de, luego influido por.
