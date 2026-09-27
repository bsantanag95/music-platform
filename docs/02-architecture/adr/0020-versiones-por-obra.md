# ADR 0020 — Versiones de una canción por su obra; se retiran las variantes de grabación

## Estado

Aceptado (cambio `redesign-song-page`, 2026-09).

## Contexto

El esquema inicial (`0000`) modelaba las versiones de una canción en la propia grabación:
`recording.variant_type` (`original`, `re_recording`, `remix`, `live`) y `recording.variant_of_id`
(a qué grabación original hace referencia). **Ninguna ingesta llegó a escribirlas.** Medido el
2026-09-27: las 21 372 grabaciones de la base de scratch y las 14 101 de la real son `original` y
ninguna tiene `variant_of`. La interfaz que las leía (etiqueta "En vivo" en la lista del álbum)
nunca mostró nada.

La autoría (`add-songwriter-credits`, migración `0049`) trajo el vínculo que sí existe:
grabación → **obra** (`recording_work`), con los atributos que MusicBrainz pone en ese vínculo
(`live`, `cover`, `instrumental`, `medley`, `partial`). La obra "November Rain" reúne 37
grabaciones: la de estudio, 16 en vivo, 4 covers de otros artistas y ~16 sin marca (demos,
en vivo mal etiquetados, masters de recopilaciones). En scratch, el 56 % de las grabaciones tiene
obra.

El rediseño de la página de canción necesita mostrar la familia de versiones y la original.

## Decisión

1. **Una página por grabación; la obra es la familia.** Estrellas, diario, favoritos, listas y
   comentarios siguen apuntando a `recording`. La página de una grabación muestra las demás
   grabaciones de su obra, agrupadas.
2. **Qué versión es una grabación lo dicen los atributos del vínculo con la obra**, tal como
   vienen de MusicBrainz, leídos al servir la página. No se deduce nada de otros datos (tipo de
   disco, título, duración): una grabación sin marca va a "Otras grabaciones".
3. **Se retiran `variant_type` y `variant_of_id`** (migración `0052`, que aborta si alguna fila
   tuviera un valor distinto del default). Los contratos que publicaban `variantType` pasan a
   `versionAttributes: string[]`.
4. **Una sola regla de orden de discos** para el disco principal de una grabación y para la
   grabación original de una obra: discos de estudio primero, después el más temprano, después el
   id. La original es la grabación sin `live` ni `cover` con el mejor disco según esa regla; una
   obra sin ninguna así no tiene original.
5. **Un `Album` con tipos secundarios no es de estudio** (`mapReleaseGroupCategory`): Demo, Remix,
   DJ-mix, Mixtape/Street, Soundtrack y demás van a `live_other`. Sin esto, un "Studio Demos" de
   1986 le ganaba al disco original en la regla anterior. Los discos existentes se reclasifican con
   `scripts/backfill-release-group-category.ts`.

## Alternativas descartadas

- **Página por obra con las versiones adentro**: obligaría a migrar todo lo social de la
  grabación a la obra y mezclaría en una misma valoración una toma en vivo de 14 minutos con la de
  estudio.
- **Completar `variant_type` / `variant_of_id` con una heurística y un backfill**: duplica el dato
  de la obra y hay que mantenerlo sincronizado; la heurística adivinaría justo donde MusicBrainz
  no marca nada.
- **Deducir "en vivo" cuando todos los discos de una grabación son en vivo**: más prolijo, pero
  inventa un dato. Se prefirió mostrar lo que dice la fuente.
- **Traer de MusicBrainz todas las grabaciones de una obra**: una request nueva por canción para
  mostrar covers de discos que nadie visitó. Queda fuera por ahora.

## Consecuencias

- Sin obra no hay versiones ni línea "Versión de…" en la canción; la cobertura crece a medida que
  se visitan discos (la página de canción agenda la sincronización de créditos y autoría del
  disco principal).
- "Otras grabaciones" incluye en vivo sin marcar y masters de recopilaciones: es ruido honesto.
- La etiqueta de versión de la lista del álbum y de las pistas adicionales sale del mismo dato y
  ahora sí aparece.
- Cualquier consulta nueva sobre "qué versión es" debe leer `recording_work.attributes`
  (`src/services/catalog/recording-versions.ts`), no un campo de `recording`.
