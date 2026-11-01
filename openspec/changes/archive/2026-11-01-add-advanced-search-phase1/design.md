## Context

`/search` es un Server Component que lee la URL (`type`, `q`, `all`, `artistType`, `category`, `decade`) y ejecuta
una sola búsqueda por tipo (`redesign-scoped-search`). Cada búsqueda combina dos fuentes:

- **Local:** `local-match.ts` busca con trigramas sobre `search_text` y aplica condiciones SQL (`artist.type`,
  `release_group.category`, `first_release_year`).
- **MusicBrainz:** `mb-query.ts` arma la consulta Lucene (`(<texto>) AND type:person`,
  `firstreleasedate:[1970 TO 1979-12-31]`), y la salida a la red pasa solo por `musicbrainz/client.ts`, con caché
  TTL por texto de consulta.

Los filtros actuales son pastillas (`FilterPills`) cuyos `href` arma `searchHref`. `params.ts` interpreta la URL de
la misma forma para la página (tolerante) y para `GET /api/catalog/search` (estricto con `q` y `type`, tolerante con
los filtros).

Los datos que usa la Fase 1 ya están en el esquema:

- `artist.country` (ISO-3166 alfa-2) y `artist.life_begin` / `artist.life_ended`. Se llenan con la ficha del
  artista (`enrich-artist-profile`); un stub que solo vino de la búsqueda puede no tenerlos.
- `release_group.first_release_year` y `recording.duration_sec`.

Los índices de búsqueda de MusicBrainz dan los campos equivalentes:

- **artist:** `country`, `begin`, `ended`.
- **release-group:** `firstreleasedate`, `artist`.
- **recording:** `artist`, `dur` (en ms).

El índice de release-group **no tiene `label`**, así que el sello pasa a la Fase 2 como filtro solo local.

## Goals / Non-Goals

**Goals:**

- Panel de filtros en `/search` con un formulario `GET` que escribe parámetros de URL.
- Filtros que se aplican con el mismo criterio en la base local y en MusicBrainz.
- Un único lector de parámetros para la página y el endpoint.
- Que filtrar no sume solicitudes a MusicBrainz.

**Non-Goals:**

- Filtros solo locales y el aviso "solo catálogo" (Fase 2). Búsqueda sin texto (Fase 3).
- Botón de filtros en el Header, filtros de Usuarios y filtros personales.
- Índices nuevos: las condiciones se aplican sobre un conjunto ya acotado por el texto.

## Decisions

### D1. El botón vive en `/search`; el Header solo enlaza

El campo del Header (`variant="compact"`) está pensado para saltar rápido a una entidad. Un panel ahí no cabe en
móvil y compite con las sugerencias. En `/search`, el botón "Filtros" va a la derecha del campo `full` y muestra el
número de filtros activos ("Filtros · 2"). El desplegable de sugerencias suma la acción "Búsqueda avanzada" junto a
"Ver todos los resultados", que navega a `/search?type=<tipo>&q=<texto>&filters=1`. `filters=1` solo abre el panel
y no es un filtro: no cuenta en el número ni en los chips.

*Alternativa descartada:* un ícono de filtros dentro del campo del Header. Suma una tercera pieza a una barra que ya
lleva selector de tipo y texto, y obliga a montar el panel en todas las páginas.

### D2. Formulario `GET` nativo con mejora progresiva

El panel es un `<form method="get" action="/search">` con `type` y `q` como campos ocultos. Sin JavaScript funciona:
el navegador envía los campos y el servidor ignora los vacíos. Con JavaScript, el envío se intercepta para quitar
los campos vacíos y navegar con `router.push`, así la URL queda limpia (`?type=artist&q=sumo&country=AR`). El panel
es un bloque desplegable (`aria-expanded`/`aria-controls`) que empuja el contenido en todos los anchos; en móvil los
campos se apilan. No es un modal ni una hoja: el panel cabe sin tapar los resultados y se puede ajustar viéndolos.

*Alternativa descartada:* estado de cliente con aplicación en vivo. Rompe "atrás" y enlazar, y dispara una búsqueda
de MusicBrainz por cada cambio de campo.

### D3. Parámetros y validación

Todos se leen en `params.ts` (`parseAdvancedFilters`), usados por la página y por el endpoint:

| Tipo | Parámetro | Valor válido |
|---|---|---|
| Artistas | `country` | dos letras; se pasa a mayúsculas |
| Artistas | `beginFrom`, `beginTo` | año de 4 cifras entre 1000 y 2100 |
| Artistas | `ended` | `0` (en actividad) o `1` (ya no) |
| Álbumes | `yearFrom`, `yearTo` | año de 4 cifras entre 1900 y 2100 |
| Álbumes, Canciones | `artist` | texto recortado, de 1 a 200 caracteres |
| Canciones | `durMin`, `durMax` | segundos enteros entre 0 y 7200 |

Un valor inválido se ignora sin error, igual que los filtros actuales. Si en un rango el desde es mayor que el
hasta, se intercambian. Un parámetro que no corresponde al tipo activo se ignora (`country` en Álbumes, por
ejemplo). El panel muestra la duración como `m:ss`, pero la URL lleva segundos (también acepta `m:ss`, lo que envía el formulario sin JavaScript).

### D4. Rango de años y década

`yearFrom`/`yearTo` y `decade` describen lo mismo. Si hay un rango, **gana el rango** y la década se ignora. Enviar
el panel quita `decade`. Elegir una pastilla de década quita `yearFrom`/`yearTo`. Con eso nunca hay dos pastillas
activas que se contradicen. Un rango con un solo extremo vale (`yearFrom=1983` = desde 1983).

### D5. Un criterio, dos traducciones

Cada filtro se define una vez y se traduce a cada fuente:

| Filtro | Local (SQL) | MusicBrainz (Lucene) |
|---|---|---|
| `country` | `artist.country = $1` | `country:AR` |
| `beginFrom`/`beginTo` | `substr(artist.life_begin, 1, 4)::int BETWEEN …` | `begin:[1980 TO 1989-12-31]` |
| `ended` | `artist.life_ended IS TRUE / IS NOT TRUE` | `ended:true` / `ended:false` |
| `yearFrom`/`yearTo` | `release_group.first_release_year BETWEEN …` | `firstreleasedate:[1983 TO 1986-12-31]` |
| `artist` (Álbumes) | existe un crédito principal cuyo artista coincide (mismo `fuzzyMatch` que el texto) | `artist:"iron maiden"` |
| `artist` (Canciones) | interpretación fija (D6) | `artist:"jeff buckley"` |
| `durMin`/`durMax` | `recording.duration_sec BETWEEN …` | `dur:[* TO 420999]` (ms; el máximo incluye su segundo) |

En el límite superior se usa `-12-31`, igual que con la década hoy, porque `firstreleasedate:[1970 TO 1979]` deja
fuera las fechas completas de 1979. Un extremo abierto se escribe `*`. Los valores van escapados con los helpers
que ya existen (`escapeLucene`, `escapeLucenePhrase`).

**Datos faltantes.** Si un filtro está activo, una fila sin el dato **no** coincide (un artista local sin país no
pasa `country=AR`), igual que MusicBrainz, que tampoco devuelve entidades sin el campo. En Artistas, la fila local y
la de MusicBrainz se fusionan por `mbid` antes de filtrar, y se usa el dato local o, si falta, el remoto. Así un
stub sin ficha que MusicBrainz confirma de Argentina no se pierde.

*Alternativa descartada:* filtrar solo en MusicBrainz y mostrar lo local sin filtrar. Mezcla resultados que no
cumplen el filtro con resultados que sí.

### D6. Artista explícito en Canciones

Hoy Canciones detecta la interpretación ("artista + título" en cualquier orden) con una búsqueda de artistas. Con
`artist`, la interpretación es fija: el texto completo es el título y `artist` es el artista. Se busca en la base
local por nombre normalizado (`findArtistsByKeys`), y la búsqueda de recordings va directo con
`recording:"…" AND artist:"…"`. Se omite la búsqueda de artistas y se hace una sola búsqueda de recordings. El
presupuesto actual ("como máximo") se cumple sin cambiarlo. `durMin`/`durMax` filtran cada grabación antes de
agruparlas (`dur:` en MusicBrainz, repetido sobre `length`, y `duration_sec` en lo local): una grabación sin duración
conocida no pasa. *Alternativa descartada:* filtrar por la grabación identidad del grupo, que solo se resuelve para el
primer grupo (los demás se muestran plegados, sin identidad).

### D7. Chips y estado de la página

Debajo del resumen de resultados, una fila de chips muestra cada filtro activo del panel ("País: Argentina",
"1983–1986", "Artista: Iron Maiden", "Hasta 7:00"), cada uno con un enlace que lo quita. El nombre del país sale de
`countryName` (`Intl.DisplayNames`). Las pastillas existentes siguen siendo la forma de ver y cambiar Persona/Grupo,
categoría y década, y no se repiten como chips. "Quitar filtros" vuelve a `/search?type=<tipo>&q=<texto>`. Con
filtros activos, el estado vacío ofrece "Quitar filtros" además de "Buscar en otro tipo". Todo filtro activo
desactiva la redirección por coincidencia exacta única (como ya pasa con `artistType`).

### D8. Caché y "Cargar más"

Los filtros forman parte del texto de la consulta Lucene, así que la caché TTL del cliente ya los distingue. "Cargar
más" arrastra los mismos parámetros (`searchHref` y el endpoint los aceptan) y sigue costando una solicitud.

## Risks / Trade-offs

- **[Datos locales incompletos]** Un artista local que nunca abrió su ficha no tiene `country` ni `life_begin`, y
  cae de los resultados filtrados aunque cumpla. → La fusión con MusicBrainz (D5) lo recupera cuando aparece en la
  página remota. El resto se acepta como el mismo criterio que usa MusicBrainz.
- **[Semántica de `begin` y `ended`]** En una persona son nacimiento y muerte; en un grupo, formación y separación.
  → Las etiquetas del panel lo dicen ("Inicio: nacimiento o formación"; "Ya no en actividad: separados o
  fallecidos").
- **[Parámetros que se acumulan]** Pasar de Álbumes a Artistas con `yearFrom` en la URL. → Los accesos "Buscar en
  otro tipo" conservan solo `q` y los filtros que el tipo destino entiende (`artist` entre Álbumes y Canciones).
- **[Rendimiento local]** Las condiciones nuevas se aplican después del filtro por trigramas, sobre a lo sumo
  `LOCAL_LIMIT` filas por tipo. → La prueba de servicio lo mide; sin índices nuevos en esta fase.
- **[Lucene mal formado]** Un `artist` con comillas o paréntesis. → Pasa por `escapeLucenePhrase`, con prueba
  unitaria por campo.

## Migration Plan

Sin migraciones. Los enlaces existentes (`artistType`, `category`, `decade`) siguen valiendo. Para revertir, basta
con quitar el panel: los parámetros nuevos se ignorarían.

## Open Questions

- Ninguna que bloquee la Fase 1. Para la Fase 2 queda decidir dónde va el aviso "Filtrando solo el catálogo" cuando
  se combinan filtros de las dos clases.
