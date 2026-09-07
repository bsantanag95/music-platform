# Scripts de mantenimiento del catálogo

Scripts operativos, no parte del path de request. Todos requieren `DATABASE_URL` y salen a
MusicBrainz solo por el cliente único con rate limit (`src/services/musicbrainz/client.ts`).

## `scripts/recanonicalize-release-group.ts`

Reevalúa la **edición representativa** de release-groups ya ingeridos (openspec:
`canonicalize-release-group`) y repuebla su **fecha de lanzamiento canónica**
(`release_group.first_release_date` / `first_release_year`).

```bash
tsx --env-file=.env scripts/recanonicalize-release-group.ts --all --dry-run   # audita, no escribe
tsx --env-file=.env scripts/recanonicalize-release-group.ts --all             # aplica
tsx --env-file=.env scripts/recanonicalize-release-group.ts <id> [<id> ...]   # ids puntuales
```

**Cuándo correrlo:**

- Una vez tras desplegar `canonicalize-release-group`, para corregir álbumes ingeridos con
  la lógica vieja (`primera oficial o primera`), que podían quedar en una deluxe / remaster
  / edición regional, y para poblar la fecha canónica de las filas existentes.
- Puntualmente, cuando MusicBrainz mejora los datos de un álbum concreto o si se ajusta la
  función de ranking (`pickRepresentativeRelease`).

**Qué hace y qué no:** si la edición representativa cambió, reemplaza `release` + `track`
del grupo (un solo `DELETE`, `track` cae por cascada; la re-ingesta usa el mismo path
determinista que un álbum nuevo). **Nunca** toca `rating`, `favorite`, `comment`,
`listen_entry`, `user_list_item`, `user_pinned_item` ni `collection_entry` — todas
referencian el `release_group`, no la edición. La fecha canónica se repuebla siempre,
cambie o no la edición. `--all` recorre todos los grupos con `mbid` con una pausa de ~1,1 s
entre cada uno.

Los fallos son por ítem: un `mbid` inválido, un 404 de MusicBrainz o un `fetch failed`
transitorio se registran y el script sigue con el siguiente. Como la operación es
idempotente, re-correr el script (o pasar solo los ids que fallaron) retoma el trabajo.
Los datos sembrados (`scripts/seed-*.ts`) usan mbids ficticios y siempre darán 404 — es
esperado.

## `scripts/backfill-release-credits.ts`

Sincroniza los **créditos** (`feat.`) de las ediciones ya ingeridas cuyo
`release.credits_synced_at` es `NULL` (releases cacheados antes de la ingesta de créditos,
migración `0004`).

**Relación con el anterior:** son complementarios y no se pisan.
`recanonicalize-release-group` decide *qué edición* representa al álbum;
`backfill-release-credits` completa los créditos *de la edición ya elegida*. Tras correr
una re-canonicalización que reemplazó ediciones, conviene correr también el backfill de
créditos para las ediciones nuevas (la re-ingesta ya trae créditos, así que en la práctica
solo hace falta si el path de re-ingesta falló a mitad).
