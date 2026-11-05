## Context

La búsqueda avanzada (`redesign-advanced-search`, `refine-advanced-search-phase1..3`) combina, por pestaña, las
coincidencias locales con una página de MusicBrainz, y exige que cada campo signifique lo mismo en las dos fuentes. Los
campos de este cambio no tienen equivalente en el índice de MusicBrainz: el de artistas no sabe de discos ni de rol, y
el de release-groups no tiene país del artista ni género propio. Datos del catálogo de scratch (2026-11-04):

| Dato | Cobertura |
|---|---|
| Género efectivo de un álbum (`release_group_effective_genre`, herencia materializada ADR 0028) | 47.949 de 63.887 álbumes (75 %) |
| País del artista principal de un álbum | 51.977 álbumes (81 %) |
| Nominaciones a premios | 1.223 álbumes, 1.079 artistas, 1.450 grabaciones |
| Discografía explorada (`discography_synced_at`) | 906 de 31.290 artistas |
| Artistas con algún disco propio (crédito `primary`) | 6.317 |
| Personal (`personnel_credit`) | instrumento 2.247 artistas, voz 1.340, productor 1.222, ingeniería 1.148, mezcla 613 |
| Ediciones sincronizadas (sello, catálogo, formato) | 123 álbumes |

## Goals / Non-Goals

**Goals:** los campos de la propuesta, con un modo solo catálogo explícito, paginado y medible.

**Non-Goals:** los de la propuesta (sello, número de catálogo, formato, valoración, Canciones, mes).

## Decisions

### 1. Modo solo catálogo

`SearchCriteria` marca qué claves son del catálogo (`CATALOG_ONLY_KEYS`: `activeFrom`, `activeTo`, `role`, `genre`,
`award`, `awardWon`, `artistCountry`). Si la búsqueda tiene alguna, `searchArtists` y `searchAlbums` no consultan
MusicBrainz ni escriben stubs: hacen una consulta local con **todos** los criterios (los de MusicBrainz también, que ya
tienen su traducción SQL), con `ORDER BY` estable, `LIMIT 25 OFFSET n` y un `count(*)` aparte para la cifra. La
respuesta conserva su forma (`total`, `nextOffset`, `remoteFailed: false`) y lleva una marca nueva `catalogOnly: true`
que la página usa para el aviso. "Cargar más" ya pagina por `offset`: el endpoint lo pasa igual.

Orden: con texto, el nivel de coincidencia calculado en SQL (exacto → palabra → prefijo → resto, como `matchTier`) y la
similitud; sin texto, Artistas por discografía explorada primero y luego por nombre; Álbumes como hoy sin texto (estudio
primero, más antiguos). Paginar en SQL impide ordenar por la actividad en la plataforma, que se calcula aparte.

Las condiciones son semi-uniones no correlacionadas (`id IN (SELECT …)`), salvo actividad y músico, que se evalúan sobre
las pocas filas que dejan las demás. Medido en scratch (mediana de 5): 9–123 ms por página; texto más género, 153 ms.
Con EXISTS correlacionado, premios de artistas tardaba 74 s. El género se filtra sobre las tablas de base
(`release_group_genre_score` y `release_group_inherited_genre`, misma regla que la vista): la vista numera los géneros
con una ventana sobre todo el catálogo y el filtro no la atraviesa (rock en álbumes: 203 → 67 ms).

*Alternativa descartada:* pedir la página de MusicBrainz y filtrar después con los datos locales. Deja páginas casi
vacías (de 25 candidatos sin género conocido se descartan la mayoría) y la cifra total no significa nada.

### 2. Activo entre

Período de actividad de un artista = `[primer año, último año]` de sus discos con crédito `primary`, solo si su
discografía está explorada (sin eso el primer disco puede ser cualquiera). Si `life_ended` no es verdadero, el período
se extiende hasta el año en curso: "sigue en actividad" según MusicBrainz. Coincide si el período se solapa con
`[activeFrom, activeTo]`. Un artista sin discografía explorada no coincide (regla de siempre: fila sin el dato no
coincide).

Se calcula en la consulta (subconsulta agregada por artista sobre `credit` ⨝ `release_group.first_release_year`). Si
no cumple el presupuesto se materializa en otro cambio; no hay migración en este.

*Alternativas:* usar la formación como respaldo para grupos sin discografía explorada (mezcla dos significados en un
mismo campo); contar también apariciones como invitado (un featuring suelto no es actividad propia).

### 3. Rol de una persona

`role` solo se acepta con `artistType=person` (sin tipo se ignora, como una bandera sin su campo). Valores:

| `role` | Condición (local) |
|---|---|
| `own` — Con discografía propia | algún `credit` `primary` en un release-group |
| `member` — Integrante de una banda | alguna fila en `membership` como persona |
| `producer` — Producción o técnica | `personnel_credit` con `relation_type` en `producer`, `engineer`, `mix`, `recording`, `programming`, `arranger` |
| `musician` — Músico en discos de otros | `personnel_credit` con `instrument` o `vocal`, en un disco donde no es artista principal |

Un rol a la vez (selector), para que la pregunta sea clara. Los datos de personal existen solo para discos abiertos con
créditos sincronizados: el aviso del modo solo catálogo lo cubre.

### 4. Etiqueta "Integrante de"

En cualquier modo, los resultados de Artistas que son personas con `membership` muestran "Integrante de <banda>" (la
banda con más actividad, y "y N más" si hay varias). Es una lectura por lote de los ids de la página (una consulta), no
cambia el orden ni el filtrado. Así una búsqueda con "Cualquiera" deja ver quién es integrante sin filtrarlo.

### 5. Género

Un género por búsqueda (`genre=<slug>`), **con sus subgéneros** (mismo recorrido recursivo de `genre_relation` que la
página de género, `src/services/genres/read.ts`). Álbumes: `release_group_effective_genre` (votos, semillas y herencia,
ADR 0028). Artistas: semilla del artista (`artist_genre_seed`) o algún disco propio con ese género efectivo. Selector:
el buscador de géneros existente (`GET /api/genres/search`, capacidad `genre-search`) con un solo valor. Un slug
desconocido u oculto se ignora.

### 6. Premios

`award=any` (cualquier premio) o el slug de un premio o salón de la fama; `awardWon=1` exige haber ganado (en un salón
de la fama toda entrada cuenta como ganada). Álbumes: nominaciones con `release_group_id` o `anchor_release_group_id`.
Artistas: nominaciones con `artist_id`, o de un álbum o grabación donde es artista principal. El selector lista los
premios cargados (pocos: lectura directa de `award`).

### 7. País del artista en Álbumes

`artistCountry` (uno o varios, como `country` en Artistas): algún artista principal acreditado del álbum tiene ese país.
Reutiliza `CountryMultiPicker`.

### 8. Formulario y página

- Los campos del catálogo van en un grupo propio por pestaña, **Del catálogo**, con una ayuda: "Buscan solo en lo que ya
  está en el catálogo, no en MusicBrainz". Activo entre va también ahí (no en Época), para que su alcance se vea.
- Rol se muestra solo con Tipo = Persona (y se limpia al cambiar el tipo).
- La etiqueta de "Año de inicio" cambia con el tipo elegido (en el cliente, sin recargar), y su ayuda también.
- Con un campo del catálogo, el encabezado de resultados lleva el aviso "Solo artistas del catálogo" / "Solo álbumes del
  catálogo" con la explicación; el aviso de búsqueda amplia y el estado vacío funcionan igual. En el estado vacío, la
  sugerencia "Sin <campo del catálogo>" deja ver cuánto da la búsqueda con MusicBrainz.
- Cambiar entre Artistas y Álbumes conserva `genre`, `award` y `awardWon` (significan lo mismo); `artistCountry` y
  `country` no se traducen entre sí.
- Barra de criterios: una pastilla por cada campo nuevo ("Activo 1980–1990", "Con discografía propia", "Rock
  (y subgéneros)", "Grammy · ganador", cada país del artista).
- Datos destacados y vista Tabla: Artistas suma la columna "Activo" cuando se filtró por actividad; Álbumes destaca el
  género y el país filtrados.

## Risks / Trade-offs

- [Cobertura baja de actividad (906 artistas) y de personal] → el aviso de solo catálogo dice qué se deja fuera; el
  campo no promete más de lo que hay. La cobertura crece con el uso (cada artista visitado explora su discografía).
- [Una búsqueda que antes daba miles de resultados de MusicBrainz da pocos al sumar un género] → es el comportamiento
  correcto y visible por el aviso; el estado vacío ofrece quitar el campo del catálogo.
- [Consultas de actividad y premios más pesadas sobre 31k artistas] → presupuesto en los specs (≤ 150 ms por página en
  scratch); si no se cumple, índice o vista materializada en un cambio aparte, medido.
- [`role=musician` confunde al artista principal que también toca] → la condición excluye los discos donde es
  principal.

## Migration Plan

Sin migraciones. Parámetros nuevos y opcionales; las URLs actuales no cambian de significado. Reversión con
`git revert`.

## Open Questions

- Ninguna bloqueante.
