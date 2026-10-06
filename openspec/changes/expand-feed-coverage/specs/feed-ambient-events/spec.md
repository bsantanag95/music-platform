## REMOVED Requirements

### Requirement: Composición de eventos ambiente de la red
**Reason**: Su única fuente, el alta en la colección física, pasa a tener fila propia en la línea
de tiempo principal de `activity-feed` (tier 3, con celda de carátula). Mantener la franja
duplicaría cada alta en `/me/feed`.
**Migration**: Las altas de colección con audiencia `followers`/`public` se leen en `listFeed`
(`kind = "collection"`); filtrables con `GET /api/me/feed?kind=collection`.

### Requirement: Presentación de la franja de eventos ambiente
**Reason**: Sin fuentes, la franja al pie de `/me/feed` se retira junto con su composición.
**Migration**: Ninguna para el usuario: las altas de colección se ven en el listado cronológico.
