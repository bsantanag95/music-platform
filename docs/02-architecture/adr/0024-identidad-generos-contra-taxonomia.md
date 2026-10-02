# ADR 0024 — Los géneros de la identidad se validan contra la taxonomía

## Estado

Aceptado (cambio `show-genres`, 2026-10). Complementa el ADR 0023.

## Contexto

"Géneros que me mueven" (`app_user.genres`, `TEXT[]`, ≤5) era una lista cerrada de 22 claves validada en la
aplicación (`src/lib/music-identity.ts`). Con la taxonomía de ~2.200 géneros (ADR 0023) esa lista deja de tener
sentido como vocabulario: limita a la persona y obliga a cambiar código para sumar un género. La columna ya guarda
slugs de la taxonomía desde la migración `0056`.

## Decisión

1. **El esquema Zod valida el formato** del slug (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤120), el tope de 5 y los repetidos.
   **El servicio valida la existencia**: todos los slugs deben ser géneros `style` de la tabla `genre`; si alguno
   no, `400 VALIDATION_ERROR` sin modificar nada. Descriptores y ocultos no son válidos.
2. `GENRES` en `src/lib/music-identity.ts` deja de ser el vocabulario permitido y queda como lista de sugerencias
   iniciales (un test la verifica contra `data/genres/taxonomy.json`).
3. **Un slug guardado que ya no es un estilo visible** (MusicBrainz retiró o fusionó el género y quedó `hidden`) **se
   ignora al mostrar** (ficha, huella, editor) y **no se reescribe** en `app_user.genres`: si el género vuelve, vuelve
   a mostrarse. La persona lo ve desaparecer, no un error.

## Alternativas descartadas

- **Tabla `user_genre` con FK a `genre`.** Más integridad referencial, pero exige una migración y reescribir lecturas por
  poco valor: el máximo es 5 y los retiros son raros.
- **Validar solo el formato.** Aceptaría slugs inexistentes y la ficha mostraría basura o nada.
- **Mantener la lista de 22.** Contradice el objetivo de que el usuario especialista pueda declarar su género real.

## Consecuencias

- `PUT /api/me/profile/music-identity` acepta cualquier estilo (cambio de contrato documentado en `contracts.md`).
- Escribir la identidad hace una consulta más a `genre` (a lo sumo 5 slugs).
- Requiere la taxonomía cargada, que ya es requisito del cambio `add-genre-taxonomy`.
