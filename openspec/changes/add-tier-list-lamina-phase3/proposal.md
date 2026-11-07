## Why

Una tier list compartida es una opinión que invita a responder: "yo pondría ese disco más arriba". Hoy quien la ve no tiene cómo armar la suya desde
ahí, y quien tiene su discografía de un artista armada no tiene un camino directo a su tier list. Es el bucle de las Láminas (`docs/05-features/sharing.md`
§6): ver una, armar la propia, compartirla. Esta es la tercera y última fase de la tier list.

## What Changes

- **"Arma la tuya" en la tier list de otra persona.** Arranca con los mismos discos o canciones que se ven en ella, cada uno en el nivel de **tu** nota
  y lo que no valoraste, en la bandeja. Nunca hereda sus notas, su bandeja ni su orden dentro de un nivel.
- **Etiquetas a elección:** si la otra persona renombró sus niveles, el formulario ofrece copiarlas (apagado por defecto). Si no, nace con S a E.
- **Con registro dirigido:** sin sesión, el mismo llamado lleva a registrarse y después a armarla, con la intención de Lámina de siempre
  (`lamina=<uuid>`, ADR 0052): una tier list es una Lámina.
- **Nueva fuente del lado del servidor** (`{ type: 'lamina', id, copyLabels }`): el servidor vuelve a leer esa tier list con las reglas de su página
  pública, así una tier list privada, oculta o de alguien que te bloqueó no presta nada.
- **"Armar tier list" en tu discografía de un artista:** un botón que la crea en un toque, con tus notas, y te lleva al editor.

Sin migración.

Fuera de esta fase: comparar dos tier lists lado a lado ("Tú vs. otra persona", §4.4); niveles variables; favoritos como fuente.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tier-laminas`: "Arma la tuya" desde una tier list ajena, con etiquetas a elección y registro dirigido; botón en la discografía propia.

## Impact

- **Código:** `src/services/laminas/tiers.ts` (fuente `lamina`, inspiración), `getTierInspiration`,
  `/api/me/laminas` (fuente nueva), `/me/laminas` (formulario inspirado), página pública de la tier list (`LaminaCta`), discografía propia (botón).
- **Base de datos:** ninguna migración.
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `business-rules.md`, `04-api/contracts.md`.
