# ADR 0019 — Varias ediciones por álbum, con representativa marcada en SQL

## Estado

Aceptado (cambio `enrich-album-editions-and-credits`, 2026-09).

## Contexto

Hasta ahora cada `release_group` tenía **una sola** fila `release`: la edición representativa
elegida por `pickRepresentativeRelease`. Las lecturas tomaban "la release del álbum" sin filtrar
(`WHERE release_group_id = ? LIMIT 1`), y la re-canonicalización borraba todas las `release` del
grupo para reingerir.

Dos necesidades rompen ese supuesto:

- **Pistas adicionales de otras ediciones** (rediseño de la página de álbum): la lista de una
  edición ampliada ("Experience Edition") se ingiere bajo demanda y tiene que convivir con la
  representativa sin reemplazarla.
- **La representativa se elegía sobre un subconjunto.** Una verificación contra MusicBrainz
  (2026-09-24, *The Dark Side of the Moon*) mostró que el lookup
  `/release-group/{id}?inc=releases+media` devuelve **25 de 150** ediciones. El lookup parece
  ordenar por fecha, así que la elección acertaba, pero es un orden no documentado.

## Decisión

1. **Browse paginado en lugar del lookup.** La ingesta pide
   `/release?release-group={mbid}&inc=labels+media+release-groups` de a 100, hasta 5 páginas en
   la primera ingesta. Trae todas las ediciones con sello, número de catálogo, formato y recuento
   de pistas por disco, y la `first-release-date` del grupo (en el release-group embebido). La
   edición representativa se elige entre todas. El resumen se guarda en `release_edition`,
   `label` y `release_edition_label`.
2. **Varias `release` por álbum, a lo sumo una representativa.** `release.is_representative`
   marca la edición cuya tracklist es la del álbum, y el índice único parcial
   `uq_release_representative (release_group_id) WHERE is_representative` lo garantiza en la
   base, no solo en la aplicación. Toda lectura de "la tracklist del álbum" filtra por la marca.
3. **La re-canonicalización mueve la marca.** Si la nueva representativa ya está ingerida, se
   intercambia la marca en una transacción; si no, se desmarca la anterior (que queda como
   edición no representativa) y se ingiere la nueva. Nada se borra.
4. **Los álbumes existentes no cambian de representativa por su cuenta.** La sincronización del
   resumen (en segundo plano desde la página, o con `scripts/backfill-release-editions.ts`) solo
   informa cuándo la elección sobre el conjunto completo sería otra; corregirla es una decisión
   explícita con `scripts/recanonicalize-release-group.ts`.

## Alternativas descartadas

- **`release_group.representative_release_id`**: referencia circular release-group ↔ release, y
  "a lo sumo una" se expresa igual de bien con el índice parcial.
- **Guardar el resumen de ediciones en `release`**: `release` significa "edición con tracklist
  ingerida"; mezclar cientos de filas sin pistas obligaría a cada lectura a distinguirlas.
- **Páginas propias por edición**: no tendrían contenido propio (valoraciones y reseñas son del
  `release_group`; cada pista ya tiene `/song/{id}`).
- **Primera página en el camino y el resto en segundo plano**: la representativa podría cambiar
  entre dos visitas, y con ella la tracklist.

## Consecuencias

- La primera visita de un álbum con más de 100 ediciones cuesta una request más por página
  (1,1 s cada una, tope de 5). La gran mayoría cabe en una página: mismo costo que antes.
- Una canción adicional aparece en las apariciones de la canción con la etiqueta de su edición.
- Cualquier consulta nueva que lea la tracklist de un álbum debe filtrar `is_representative`.
