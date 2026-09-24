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

**Qué hace y qué no:** evalúa sobre **todas** las ediciones del grupo (browse paginado) y
también repuebla el resumen de ediciones. Si la edición representativa cambió, **mueve la
marca** `is_representative` (cambio `enrich-album-editions-and-credits`, ADR 0019): si la
nueva ya estaba ingerida como variante, solo intercambia la marca; si no, desmarca la anterior
—que queda como edición no representativa— e ingiere la nueva. No borra ediciones. **Nunca** toca `rating`, `favorite`, `comment`,
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

## `scripts/backfill-release-editions.ts`

Sincroniza el **resumen de ediciones** (todas las ediciones del álbum, con sello, número de
catálogo, formato y recuento de pistas) de los álbumes cuyo `release_group.editions_synced_at`
es `NULL` — los ingeridos antes del cambio `enrich-album-editions-and-credits`. La página de
álbum hace lo mismo en segundo plano en la primera visita; el script lo hace en lote.

```bash
tsx --env-file=.env scripts/backfill-release-editions.ts --limit 20 --dry-run --report-representative
tsx --env-file=.env scripts/backfill-release-editions.ts --report-representative
```

**Nunca cambia la edición representativa.** Con `--report-representative` lista los álbumes
cuya representativa sería otra con el conjunto completo de ediciones; se corrigen a mano, uno
por uno, con `recanonicalize-release-group.ts <id>`. Cuesta una request por cada 100
ediciones del álbum (tope de 5).

## `scripts/backfill-personnel-credits.ts`

Sincroniza los **créditos de personal** (instrumentos, voz, producción, ingeniería, arte) de
las ediciones representativas cuyo `release.personnel_synced_at` es `NULL`, y las pertenencias
de la banda cuando todavía no se sincronizaron (sin ellas un integrante se clasificaría como
invitado). La página de álbum lo hace en segundo plano; el script, en lote.

```bash
tsx --env-file=.env scripts/backfill-personnel-credits.ts --limit 20 --dry-run
tsx --env-file=.env scripts/backfill-personnel-credits.ts
```

Una request por álbum (más una por banda sin pertenencias). Reemplaza los créditos de personal
de la edición y de sus grabaciones en una transacción: si falla, se conservan los anteriores y
el álbum queda pendiente.
