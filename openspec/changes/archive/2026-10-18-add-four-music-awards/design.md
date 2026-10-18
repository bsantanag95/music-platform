## Context

Los premios se curan a mano en `data/awards/<premio>/` (ADR 0032): `categories.json` (clave, nivel `general`/`album`/`genre`, sujeto
`release_group`/`recording`/`artist`, `honors`, campo en el nivel de género, nombre es/en, predecesora, orden) y `ceremonies/<año>.json`
(edición, fecha, `sourceUrl` y las categorías con sus nominados). `resolve-award-nominees.ts --award <premio> --year <año>` resuelve a MBID
por el cliente de MusicBrainz y `load-awards.ts` carga de forma idempotente. Una prueba de CI valida todos los archivos (nivel `genre` exige
campo y nombre del campo en es/en, campos contiguos, `complete` con al menos tres nominados). Los Grammy 2021–2026 tienen 155–182
nominaciones por ceremonia en 28–33 categorías, resueltas ~93 % de forma automática y el resto a mano. El modelo ya admite otros premios
agregando su carpeta; lo que no admite sin cambios es la forma de la página: la sección "Premios" de Explorar (`listRecentCeremonies(5)`) toma
las últimas 5 ceremonias de cualquier premio, y `/awards` redirige mientras haya uno solo.

Verificado en la web el 2026-10-18: Latin Grammy 2026 es el 12-nov (27.ª), Mercury 2026 el 22-oct, Brit 2026 el 28-feb (cerrada), Premio Lo
Nuestro 2026 el 19-feb (38.ª edición, cerrada).

## Goals / Non-Goals

**Goals:**
- Sumar cuatro premios (2021 en adelante) que encajen con el modelo y con el contexto de la plataforma, en un solo cambio.
- Que la página siga siendo útil con cinco premios (Explorar y el hub), sin tocar el modelo de datos.
- Dejar escrito por qué estos cuatro y con qué criterios se sumarían otros.

**Non-Goals:**
- Años anteriores a 2021, otros premios, un sujeto "video", distinguir el tipo de votación por categoría o automatizar el borrador desde Wikipedia.

## Decisions

1. **Un cambio, cuatro premios, un punto de control por premio.** El orden de trabajo es Mercury → Brit → Latin Grammy → Lo Nuestro (de menos
   a más volumen: ~70, ~360, ~1.250 y ~1.000 nominaciones, estimado). Cada premio es independiente de los demás: se puede resolver, revisar,
   cargar y probar por separado, y los datos de uno no bloquean el código ni a los otros. El código (Explorar, hub, migas) va primero porque
   se prueba con los Grammy y el Mercury ya cargados.
2. **Criterios para sumar un premio** (ADR 0043): (a) el sujeto de cada categoría es un álbum, una grabación o un artista del catálogo;
   (b) hay ceremonias cerradas desde 2021; (c) se decide por jurado, industria o una votación mixta (no por votos del público exclusivamente ni
   por listas de ventas: no hace falta "mérito", pero sí que sea un premio y no una lista); (d) es relevante para la interfaz en español; (e) el
   volumen es abordable. Por eso entran Latin Grammy, Lo Nuestro, Brit y Mercury y salen AMAs (fans, y un año sin ceremonia), Billboard Latin
   (listas), Juno (volumen y relevancia), Ivor Novello (nicho), Polaris (duplica el Mercury) y MTV/EMAs/BET (videos).
3. **Slugs y nombres.** `mercury-prize` ("Premio Mercury" / "Mercury Prize"), `brit-awards` ("Premios Brit" / "Brit Awards"), `latin-grammy`
   ("Premios Latin Grammy" / "Latin Grammy Awards") y `lo-nuestro` ("Premio Lo Nuestro" / "Premio Lo Nuestro"), en `names.<slug>` de
   `messages/{es,en}/awards.json`. El título de la ceremonia sigue siendo `"{premio} {año}"`.
4. **Alcance por premio: toda categoría con nominados cuyo sujeto sea álbum, grabación o artista.** Se reutilizan los niveles del ADR 0042:
   - **Mercury:** una categoría general, Álbum del año (`release_group`), 12 nominados, cobertura `complete`.
   - **Brit:** general (álbum, canción, artista, grupo, artista nuevo, internacional, y productor, compositor y la categoría de revelación
     donde existan); nivel `genre` con los actos por género (pop, hip hop/grime/rap, dance, alternativa/rock y R&B, sujeto artista) que
     reutilizan los campos `pop`, `rap`, `dance-electronic`, `rock-alternative` y `rnb`. Las categorías con nombre por género o por origen que
     se renombraron (p. ej. las de artista masculino y femenino que pasaron a una sola) se enlazan con `predecessor`.
   - **Latin Grammy:** general (Álbum, Grabación y Canción del año, Mejor artista nuevo, y compositor y productor del año); nivel `album`
     con todos los "Mejor álbum de …"; nivel `genre` con las canciones y grabaciones por campo (pop, urbano, rock y alternativa, tropical,
     regional mexicano, cantautor, brasileña y portuguesa, y "otros géneros" para cristiana, jazz, tango, folclor y flamenco, donde no hay
     más de una o dos categorías por campo).
   - **Lo Nuestro:** general (artista, artista nuevo, álbum, canción y colaboración del año); nivel `album` con el álbum del año por género
     (pop, urbano, regional mexicano, tropical); nivel `genre` con artistas y canciones por género (campos `pop`, `urban`, `regional-mexican`,
     `tropical`).
   - **Se excluyen** los reconocimientos honoríficos sin nominados, el video, la ingeniería, el empaque, los arreglos y las composiciones
     clásicas sin grabación: no tienen un sujeto del modelo. El detalle fino (qué categorías existieron en cada año y cómo se renombraron) se
     fija al curar cada ceremonia contra su artículo de Wikipedia, no aquí.
5. **Campos nuevos con nombre es/en:** `urban` (Urbano), `tropical` (Tropical), `regional-mexican` (Regional mexicano), `singer-songwriter`
   (Cantautor), `brazilian` (Brasileña y portuguesa) y `other-genres` (Otros géneros). Los de Brit reutilizan los que ya existen. La prueba de CI
   que ya exige nombre por campo cubre los nuevos. "Otros géneros" es un cajón de sastre aceptado: evita un campo por cada género con una
   sola categoría. Si más adelante pesa, se parte.
6. **Explorar: una tarjeta por premio.** `listRecentCeremonies(limit)` se reemplaza por `listLatestCeremoniesByAward()`: la ceremonia más
   reciente de cada premio (por `heldOn`), con el mismo ganador destacado (la categoría general de álbum de menor orden curado: Álbum del
   año en los cuatro), ordenadas de la más reciente a la más antigua. Sigue siendo una consulta para las ceremonias y otra para los
   ganadores, no una por tarjeta. Una ceremonia sin categoría general de álbum con ganador muestra la tarjeta sin ganador, como hoy.
7. **El hub `/awards`** (con más de un premio) es la misma tarjeta en una grilla, sin descripción ni rótulo: `AwardTile` se extrae de
   `AwardsExploreSection` y lo usan Explorar y el hub. Con un solo premio no cambia (redirige). La tarjeta enlaza a `/awards/<premio>`, que
   ya redirige a la ceremonia más reciente.
8. **Migas de pan con "Premios".** Inicio / Premios / <premio> / <año> en la ceremonia, e Inicio / Premios / <premio> / <categoría> en la
   historia. "Premios" enlaza a `/awards` (el hub; con un solo premio redirige a su ceremonia, lo cual es aceptable).
9. **Tipo de votación por premio, indicado en la ceremonia.** Cada premio declara en su `categories.json` un campo `voting`
   (`academy`, `jury`, `public` o `mixed`; obligatorio): Grammy, Latin Grammy y Brit = `academy` (votan los miembros de la academia o de
   la industria), Mercury = `jury`, Lo Nuestro = `mixed` (público y comité). Los valores se confirman contra el artículo de cada premio al
   curarlo. Es por premio, no por categoría: las excepciones (una categoría de los Brit votada por el público) no se marcan y se
   mencionan en el ADR. Se guarda en `award.voting` (nula hasta la próxima carga; la página omite el dato si falta) y la cabecera de la
   ceremonia lo muestra en una línea ("Votan los miembros de la academia"). No se muestra en las tarjetas del hub ni de Explorar.
9b. **Fuente en la ceremonia.** El `sourceUrl` de cada ceremonia (hoy solo en los archivos) se guarda en `award_ceremony.source_url` y la
   cabecera muestra "Fuente: <sitio>" enlazado (`rel="noopener noreferrer"`; el texto es el host de la URL, sin nombres propios en los
   mensajes). Cubre la atribución de Wikipedia (CC BY-SA). Una ceremonia sin la columna cargada omite la línea.
9c. **Migración `0073` aditiva.** Dos columnas nulas con `CHECK` (`voting IN ('academy','jury','public','mixed')`,
   `source_url ~ '^https?://'`), sin valores de relleno inventados: las filas existentes se completan al volver a correr `load-awards.ts`,
   que ya es idempotente y compara antes de escribir.
10. **Las ediciones de 2026 del Latin Grammy (12-nov) y del Mercury (22-oct)** quedan fuera: el modelo solo admite ceremonias cerradas, y se
    agregan después con `resolve` y `load`, sin cambios de código.
11. **Datos solo en la base de scratch.** Se resuelve y se carga en la base de prueba y se corre el smoke; cargar en la base real es el paso
    operativo de siempre (`load-awards.ts`), igual que las migraciones y cargas pendientes de otros cambios.

## Risks / Trade-offs

- **El costo es la curaduría, no el código:** ~2.500 nominaciones, de las que ~7–10 % necesitarán resolución manual (estimado por las
  cifras de los Grammy). Los dos premios latinos son ~80 % del trabajo. Mitigación: orden por volumen y puntos de control por premio; si el
  Latin Grammy o Lo Nuestro se alargan, el cambio puede cerrarse con los otros dos y los latinos entrar después sin tocar el código.
- **Resolución de títulos en español y colaboraciones** (`feat.` con varios artistas, grafías estilizadas): más ambiguos que los Grammy
  anglo. Se usa el mismo mecanismo (`searchAs`, ancla por disco, `manual`) y se mide el porcentaje exacto por premio.
- **Cobertura de MusicBrainz para música regional mexicana y tropical:** puede ser menor; un nominado sin resolver se muestra como texto y
  la ceremonia se publica igual (ADR 0032, decisión 4).
- **Fuente única (Wikipedia, CC BY-SA)** para cuatro premios más: cada ceremonia guarda su `sourceUrl` y la página la muestra (decisión 9b).
- **El tipo de votación es por premio**, no por categoría: puede simplificar demasiado (Brit y Lo Nuestro mezclan). Se acepta; la línea dice
  cómo se decide el premio en general, y el ADR registra las excepciones.
- **El campo "otros géneros"** mezcla cosas distintas. Es un cajón de sastre deliberado y barato; se revisa si crece.
- **Más premios en la página de ceremonia no cambian su estructura**, pero un premio de una sola categoría (Mercury) tiene una página muy
  corta; es lo esperable.

## Migration Plan

Una migración aditiva (`0073`, decisión 9c) y, después, sin más migraciones. Cada premio es una carpeta nueva en `data/awards/`; `load-awards.ts` crea el premio, sus ceremonias, categorías y
nominaciones, y es idempotente (una segunda corrida no cambia filas). Revertir un premio es quitar su carpeta y volver a cargar (la carga
borra las ceremonias que ya no están en los archivos, como cubre el smoke).

## Open Questions

Ninguna abierta: la fuente se muestra (9b) y el tipo de votación se indica por premio (9).
