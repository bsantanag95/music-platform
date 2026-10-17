## Context

`add-music-awards` (ADR 0032) dejó los Grammy 2021–2025 curados en `data/awards/grammy/` con dos niveles de categoría:
`general` (Álbum, Grabación y Canción del año, Artista nuevo) y `genre` (los nueve "Mejor álbum de …"). El modelo ya
admite tres tipos de sujeto (`release_group`, `recording`, `artist`) y el cargador valida que el sujeto de la
categoría coincida con la semilla de cada nominado.

Lo que falta es contenido y una jerarquía más fina. El contenido nuevo cabe casi entero en el modelo actual:

- Interpretaciones, grabaciones y canciones por género son `recording` con disco ancla (igual que Grabación y Canción
  del año). "Canción" usa `honors: songwriter`.
- Productor y Compositor del año premian a una **persona**. Esa persona ya tiene perfil: el sujeto `artist` de "Mejor
  artista nuevo" sirve tal cual, y el perfil de artista es la página a la que enlaza la nominación. No hace falta un
  sujeto ni una tabla nueva.

Lo que sí cambia es la jerarquía (tres niveles, no dos) y, con ella, tres lugares que hoy tratan "no general" como un
solo bloque: `sortCategoryEditions` (`src/services/awards/read.ts`), el orden de ganadores de
`ceremonyContext` (`collection-context.ts`) y el de la plantilla `grammy-winners` (`templates-day-zero.ts`).

Los datos de 2021–2025 que están hoy fueron revisados por la persona curadora contra Wikipedia; los que se agregan
deben pasar el mismo proceso (`sourceUrl` por ceremonia).

## Goals / Non-Goals

**Goals:**
- Agregar la ceremonia 2026 y 21 categorías nuevas, en las seis ceremonias, enlazadas al catálogo.
- Tres niveles legibles en la página de ceremonia: Campo general → Por álbum → Por género (agrupado por campo).
- Que las comprobaciones de integridad nuevas vivan en la validación del esquema (CI), no en una nota de
  documentación.

**Non-Goals:**
- Cubrir todas las categorías del Grammy.
- Insignias de ganador en fichas, ganadores históricos, otros premios (siguen fuera, como en `add-music-awards`).
- Cambiar el flujo de resolución (`resolve-award-nominees.ts`) o la forma de la nominación.
- Una pantalla de administración para curar premios (ADR 0032 la deja para más adelante).

## Decisions

### D1. Tres niveles: `general`, `album`, `genre`

`AWARD_CATEGORY_TIERS` pasa a `["general", "album", "genre"]`, **en ese orden**, y el orden de la tupla es el orden de
presentación. Las nueve categorías "Mejor álbum de …" pasan a `album`; `genre` queda para interpretaciones, canciones
y grabaciones por género.

El nivel `genre` conserva su nombre en el esquema pero cambia de significado (antes: "álbumes por género"). Es un
cambio de datos, no de estructura: la migración mueve las filas existentes y el cargador, que reescribe `tier` desde el
JSON, deja la base coherente en cualquier caso.

*Alternativa descartada:* un único nivel con la categoría `field` para agrupar todo ("Pop: álbum, interpretación,
canción"). Es otra forma de organizar, pero rompe la jerarquía pedida (lo general primero, luego los álbumes, luego lo
menor) y mezcla en una misma tarjeta cosas de peso muy distinto.

### D2. Un orden único de niveles, en un solo lugar

Hoy tres sitios escriben "general primero, el resto después" a su manera (`Number(tier !== "general")` en TypeScript;
`(tier = 'general') desc` en SQL, dos veces). Con tres niveles, repetirlo es la forma de que uno se quede atrás.

Se exporta de `src/db/schema.ts` junto a la tupla: `awardTierRank(tier)` (posición en `AWARD_CATEGORY_TIERS`) y
`awardTierRankSql(column)` (un `CASE` generado a partir de la misma tupla). `sortCategoryEditions`, `ceremonyContext`
y `grammy-winners` lo usan; una prueba recorre la tupla y comprueba que los dos coinciden. Así agregar un cuarto nivel
es tocar la tupla.

### D3. Campo (`field`) para agrupar el nivel `genre`

Veinte tarjetas seguidas en "Por género" son una pared. Cada categoría de nivel `genre` declara un **campo**
(`pop`, `dance-electronic`, `rock-alternative`, `rnb`, `rap`, `country`) y la página muestra un subtítulo por campo.

- Columna `award_category.field TEXT NULL` + `CHECK (field ~ slug)` + `CHECK (tier <> 'genre' OR field IS NOT NULL)`.
  Las categorías de otros niveles no lo usan.
- El nombre visible del campo es texto de interfaz (`messages/{es,en}/awards.json`, `fields.<clave>`), no un dato del
  JSON: la lista de campos es corta y estable y el patrón de traducción de la página ya es ese.
- **Se hace cumplir en código:** una prueba lee `categories.json` y falla si algún `field` no tiene traducción es y en.
  Sin eso, un campo nuevo se mostraría con su clave cruda.
- El orden de los campos es el orden curado de sus categorías (`order`), no una lista aparte.

*Alternativa descartada:* tabla `award_field` con nombres es/en. Más fiel al modelo, pero es una tabla, un archivo y
un cargador para seis valores que casi nunca cambian.

### D4. Productor y Compositor del año: sujeto `artist`, nivel `general`

- `subject: "artist"`, `honors: "performer"` (la persona es la homenajeada, no hay que aclarar autoría). El texto del
  nominado es el nombre. Las obras que la fuente cita por nominado (hasta una decena de canciones y discos) no se
  cargan: el nombre enlazado al perfil es lo que importa y la lista larga ensuciaría la tarjeta.
- La resolución usa la rama `artist` existente (nombre idéntico). Productores y compositores son, en MusicBrainz,
  personas con nombres cortos y homónimos frecuentes ("Dijon", "Cirkut", "Sounwave"): se espera algún `ambiguous` que la
  persona curadora fija a mano, como con "Anti-Hero" en `add-music-awards`. Lo que no resuelva se muestra como texto.
- Van en el nivel **general** (junto a las cuatro grandes y debajo de ellas): son transversales a todos los géneros,
  que es el criterio del nivel, y la persona que las pidió las trató como parte del campo general.
- "Compositor del año" no clásico solo existe desde la ceremonia de 2023: en 2021 y 2022 la categoría no está en el
  archivo (no es un hueco, la ceremonia no la tenía). "Productor del año" existe en las seis.
- Efecto en el perfil de artista: ninguno todavía. La insignia en el perfil es el cambio posterior ya acordado; esta
  categoría solo deja la nominación enlazada y apuntando a su perfil (`idx_award_nomination_artist` ya existe para
  leerla).

### D5. Criterio de selección

Entra una categoría si cumple una de estas:

1. **Transversal**: no pertenece a un género (las cuatro grandes, Productor y Compositor del año).
2. **Álbum de un campo principal**: "Mejor álbum de …" de los campos de música popular de gran público.
3. **Interpretación, canción o grabación de un campo principal**, y solo de los seis campos: pop, dance/electrónica,
   rock/metal/alternativa, R&B, rap y country. Latino no tiene categorías de este tipo; tiene solo álbumes.

Se descartan las **técnicas** (ingeniería, empaque, notas, arreglo, producción clásica, remezclas), las de **otro
formato** (video musical, película, banda sonora de videojuegos o de medios visuales, comedia, palabra hablada, teatro
musical, infantil), las **de nicho** (clásica, jazz, góspel, raíces —americana, folk, bluegrass, blues—, reggae,
música global y africana, polka, nueva era) y las **de género muy específico dentro de un campo** (álbum progresivo de
R&B, álbum latino tropical y de jazz latino). El criterio vive aquí y en `docs/05-features/awards.md`; la lista
completa de claves cargadas es la de `categories.json`.

**Selección final** (clave → nombre es). 22 categorías nuevas (la de 2021 la revela la fuente: "Mejor grabación dance" se
renombró en 2022, y por la regla del ADR 0032 un renombre es una categoría distinta enlazada a su predecesora):

| Nivel | Campo | Categorías |
|---|---|---|
| general | — | `producer-of-the-year-non-classical` Productor del año, `songwriter-of-the-year-non-classical` Compositor del año (ambas no clásicas) |
| album | — | `best-contemporary-country-album` Mejor álbum contemporáneo de country y `best-traditional-country-album` Mejor álbum tradicional de country (desde 2026; predecesora `best-country-album`) |
| genre | pop | `best-pop-solo-performance`, `best-pop-duo-group-performance` |
| genre | dance-electronic | `best-dance-recording` (solo 2021; la ceremonia de 2022 la renombró), `best-dance-pop-recording` (desde 2025), `best-dance-electronic-recording` (desde 2022; predecesora `best-dance-recording`) |
| genre | rock-alternative | `best-rock-performance`, `best-metal-performance`, `best-rock-song`, `best-alternative-music-performance` |
| genre | rnb | `best-rnb-performance`, `best-traditional-rnb-performance`, `best-rnb-song` |
| genre | rap | `best-rap-performance`, `best-melodic-rap-performance`, `best-rap-song` |
| genre | country | `best-country-solo-performance`, `best-country-duo-group-performance`, `best-country-song` |

Las nueve categorías de álbum existentes y las cuatro generales actuales no cambian de clave. Si una categoría no
existió en un año (la grabación dance pop antes de 2025, la interpretación alternativa antes de 2023, Compositor del
año antes de 2023), simplemente no está en el archivo de esa ceremonia.

*Interpretación del pedido:* "mejor grabación" se tomó como las categorías "Recording" de dance/electrónica, porque
"Grabación del año" ya está en el campo general.

### D6. Orden y página

- Orden de nivel: D2. Dentro de cada nivel, el `order` curado; `validateCategories` exige que las categorías de un
  mismo campo sean contiguas en `order`, así que el orden de los campos sale del de sus categorías y no hace falta
  una lista aparte.
- La página de ceremonia añade una navegación de saltos (Campo general · Por álbum · Por género) y un subtítulo por
  campo. Niveles `h2`, campos `h3` y categorías `h4`; `AwardCategory` acepta `headingLevel="h4"`.
- Un nivel sin categorías en esa ceremonia no se muestra (hoy ya ocurre con `genre`).
- Los textos de nivel: "Campo general", "Por álbum", "Por género" (es) / "General field", "By album", "By genre" (en).
  Reemplazan a "Mejor álbum por género".

### D7. La colección `grammy-winners` conserva su regla, con el orden nuevo

Sigue tomando los ganadores con álbum (directo o ancla). Cambia solo el orden: nivel (D2), luego clave. Como el tope de
la colección es de 12 álbumes, entran primero los generales y los de nivel `album`; las interpretaciones por género casi
nunca llegarán al corte, y los ganadores de Productor y Compositor del año no aportan álbum, así que no se cuelan. Sin
cambio de qué cuenta como "ganador con álbum".

### D8. Cobertura, fuente y guardas de integridad

- Cada ceremonia sigue citando su `sourceUrl` (Wikipedia, artículo de la ceremonia). La cobertura es `complete` para
  todo lo cargado; `winner_only` queda solo como recurso explícito si una categoría no se puede verificar.
- **Guarda en la validación:** una categoría `complete` con menos de 3 nominados es un error de
  `validateCeremony` (con archivo y categoría). Los Grammy tienen cinco nominados por categoría (ocho en las grandes
  desde 2022); tres deja margen para empates y categorías excepcionales y atrapa el caso real de cargar "completa" una
  lista que quedó con uno.
- **Extracción de la fuente:** la lectura automática de la página (resúmenes del modelo) omite nominados y trunca
  tablas largas. Por eso los datos se escriben desde la página de cada ceremonia leída por tramos y, antes de commitear,
  cada categoría se contrasta con su cuenta de nominados (5 u 8) y con la lista de ganadores del artículo. Lo que no
  cuadre se corrige a mano en el JSON; el archivo versionado es la fuente de verdad (ADR 0032).
- El script de resolución sigue sin elegir por su cuenta: ambiguo es ambiguo.

### D9. Esquema: migración `0072`

Un archivo nuevo, en este orden (para que ninguna fila viole una restricción a mitad de camino):

1. `ALTER TABLE award_category ADD COLUMN field TEXT` + `CHECK` de formato.
2. `DROP CONSTRAINT chk_award_category_tier`; `UPDATE award_category SET tier = 'album' WHERE tier = 'genre'`
   (mapeo conocido: toda categoría `genre` de `add-music-awards` es un "Mejor álbum de …"); nuevo `CHECK` con los tres
   niveles.
3. `CHECK (tier <> 'genre' OR field IS NOT NULL)`.

No inventa valores: `field` queda `NULL` donde no aplica. Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`.

## Risks / Trade-offs

- **Volumen de resolución de grabaciones** (17 categorías de grabación nuevas × hasta 6 años × 5 nominados) → muchos
  `ambiguous` por versiones duplicadas en MusicBrainz → el flujo ya lo prevé: se cargan como texto y la persona
  curadora los fija; el reporte los lista. Se trabaja por ceremonia para poder detenerse sin dejar datos a medias.
- **Errores en los datos** (los resúmenes de la fuente son incompletos) → D8: conteos contra la fuente, validación en
  CI, revisión por ceremonia. El archivo es auditable en git.
- **Una grabación sin disco** (sencillo suelto) → el ancla puede ser el release-group del sencillo; es lo que ya admite
  la semilla de ancla. En el listado de la ceremonia se muestra la carátula del sencillo.
- **Página larga** → navegación por saltos y subtítulos por campo; sin colapsables (se evalúa si aún pesa tras ver la
  página con datos reales).
- **Homónimos al resolver Productor/Compositor** → se esperan y se resuelven a mano; sin ellos la nominación queda como
  texto, sin enlace al perfil.
- **El nivel `genre` cambia de significado** → cualquier consumidor que filtre por `tier = 'genre'` esperando álbumes
  se rompe en silencio. Los usos actuales se revisaron (`read.ts`, `collection-context.ts`, plantilla, página,
  smoke test `smoke-test-music-awards.ts`) y todos se actualizan en este cambio.

## Migration Plan

1. Aplicar `0072` en la BD de scratch, correr `scripts/load-awards.ts` y el smoke test de premios.
2. En la BD real, `0068` y `load-awards` siguen pendientes desde `add-music-awards`: se aplican en orden (`0068`…`0072`)
   y recién entonces se carga. En una BD sin premios cargados el `UPDATE` de `0072` no toca filas.
3. Reversa: no hay migración inversa (convención del repositorio); como los datos son reproducibles desde el JSON,
   basta con volver a cargar con la versión anterior del código y el JSON anterior.

## Open Questions

Con estas respuestas por defecto el cambio se puede implementar; cada una se cambia sumando una categoría al JSON.

1. **África y música global** (`Best African Music Performance`, `Best Global Music Performance`): por defecto
   **excluidas** (de nicho). Afrobeats tiene presencia fuerte; si se quiere, entra como un campo propio en `genre`.
2. **Otros álbumes de campos grandes** (Rock o alternativo latino, Música mexicana, R&B progresivo): por defecto
   **excluidos**. "Música mexicana" es la que más pesa comercialmente.
3. **Productor y Compositor del año en el nivel general** (por defecto) o en un nivel propio "Creadores" entre general
   y álbum.
4. **Cobertura de los años viejos**: por defecto `complete` en todos; si el costo de verificar 2021–2022 pesa,
   `winner_only` en las categorías nuevas de esos dos años y completarlas después.
