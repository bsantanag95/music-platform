## Context

Tercera fase de `add-tier-list-lamina`. Decisiones tomadas al abrirla (2026-11-07): "Arma la tuya" hereda los mismos discos o canciones ubicados por la
nota de quien la arma; copiar las etiquetas es una elección de esa persona; el llamado en la discografía propia es un botón que la crea en un toque.

Estado de partida:

- El Top N ya tiene "Arma la tuya": `LaminaCta` con la intención `lamina=<uuid>` (ADR 0052), `laminaBuildHref(id)` → `/me/laminas?desde=<id>`, y
  `getLaminaInspiration(id, viewerId)`, que hereda formato, tipo y título como sugerencia y devuelve `null` si la Lámina no se puede ver o es propia.
  Solo mira `kind = 'top'`.
- La tier list (Fases 1 y 2) se crea con fuentes `discography`, `album` y `picked`, todas ubicadas por `placeTargets` con la nota que lee el servidor. La
  página pública no muestra la bandeja ni, salvo que se encendieran, las notas.
- La discografía propia (`/users/<u>/artist/<id>`) ya tiene, para su dueño, "Valora lo que falta" y sus preferencias.

## Goals / Non-Goals

**Goals:**

- Que responder a una tier list ajena sea un toque: los mismos ítems, con tu criterio.
- Que nada de lo ajeno que no se ve en su página llegue a la tuya.
- Reusar el llamado, la intención y el registro dirigido del Top N, sin una intención nueva.

**Non-Goals:**

- Comparación lado a lado. Copiar la bandeja, las notas o el orden de la otra persona.

## Decisions

### 1. Fuente `lamina`, resuelta en el servidor

`POST /api/me/laminas` con `{ kind: 'tier', title, entityType, source: { type: 'lamina', id, copyLabels } }`. El servidor lee esa tier list con
`getUserTierList(owner, id, viewerId)` (las reglas de su página pública: audiencia, moderación, bloqueo, cuenta desactivada) y toma sus ítems en niveles,
de S a E y en su orden, nunca la bandeja. Los ubica con `placeTargets` por la nota de quien la arma. Con `copyLabels`, copia sus seis etiquetas; si no,
S a E. `entityType` debe coincidir con el de la tier list ajena. Si no se puede ver, es propia o no es una tier list: `LAMINA_NOT_FOUND`. Nace privada.

- **Por qué en el servidor y no `picked`:** con `picked` el cliente mandaría los ids que leyó, y nada impide inventar otra lista; además la visibilidad
  se volvería a comprobar en el mismo pedido que crea. El servidor ya tiene la regla.

### 2. Inspiración por tipo

`getTierInspiration(id, viewerId)`, junto a `getLaminaInspiration` (que sigue siendo del Top N): cada una devuelve `null` si `desde` no es de su tipo, no se
puede ver o es propia, así la página las pide en paralelo y cada formulario recibe la suya. Para una tier list: id, título, tipo, cantidad de ítems en
niveles, sus etiquetas, si son propias (distintas de S a E) y el usuario. Nunca los ítems, sus notas ni la bandeja: el formulario solo muestra el resumen; el servidor arma.

`/me/laminas?desde=<id>` pasa la inspiración al formulario que corresponde: un Top N al de Top N (como hasta ahora), una tier list a `TierListCreateForm`,
que en ese caso va primero,
con la fuente "Como la de @usuario" elegida, su tipo, su título como sugerencia, "N discos; cada uno caerá en el nivel de tu nota" y, si tiene etiquetas
propias, la casilla "Usar sus etiquetas (Obra maestra, …)", apagada.

### 3. Llamado e intención

La página pública de una tier list muestra `LaminaCta` a quien no es su dueño, con textos propios ("¿Cómo la armarías tú?"). La intención es la de Lámina
(`lamina=<uuid>`): una tier list es una Lámina y el destino es el mismo (`/me/laminas?desde=`). No hace falta un ADR nuevo; ADR 0052 ya la define para
cualquier Lámina.

### 4. Botón en la discografía propia

En `/users/<u>/artist/<id>`, para su dueño y con discos a la vista, "Armar tier list" crea con la fuente `discography` y el título "Tier list de
{artista}", y lleva al editor. Un fallo se avisa en el lugar. Quien mira la discografía de otra persona sigue viendo su "Arma la tuya" de discografía.

## Risks / Trade-offs

- **[Una tier list ajena de 50 ítems]** → entran todos los de sus niveles, nunca más de 50.
- **[Las etiquetas pueden ser personales]** → copiarlas es opcional y está apagado; copiar no las vincula: después son tuyas.
- **[Tocar dos veces el botón de la discografía]** → el botón se deshabilita mientras crea; una segunda tier list del mismo artista es legítima.

## Migration Plan

Sin migración. `0079` a `0086` siguen pendientes en la BD real, en orden.

## Open Questions

Ninguna.
