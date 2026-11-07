## Context

Primera fase de `add-top-n-lamina`. Decisiones tomadas al abrirla (2026-11-06): hasta 10 carátulas con ADR nuevo, `user_list` con `kind`
nuevo, álbumes y canciones, y tres fases. El primer borrador del diseño está en `src/services/share/frame/TopFrame.tsx`, con muestras generadas para revisar.

Estado de partida:

- `user_list.kind` admite `standard`, `artist_journey` y `custom_journey`. Listados, descubrimiento, feed, guardados y perfil filtran por
  `standard`, así que un tipo nuevo queda fuera sin tocarlos. Camino es el precedente: rutas propias sobre la misma tabla.
- La exportación lee `user_list` sin filtrar por tipo.
- `rating` no tiene audiencia: mostrar una nota es abrir un dato (ADR 0050).
- ADR 0049 limita cada imagen a 4 carátulas de ≤250 px. `SHARE_FORMATS` tiene `link` y `story`.
- `useTargetSearch` es el buscador local-first de los pickers.

## Goals / Non-Goals

**Goals:**

- Armar y publicar un ranking en menos de un minuto.
- Dejar la base de las Láminas de autor: la tier list reutilizará ruta, editor y formatos.
- Que el Top se vea de la misma casa que todo lo demás.

**Non-Goals:**

- Fuentes automáticas, filtros y títulos sugeridos (Fase 2). "Arma la tuya" (Fase 3).
- Artistas como ítems: cada foto de Commons exige su crédito, y 10 no entran en la línea.
- Guardar o seguir Láminas ajenas; estante en el perfil.

## Decisions

### 1. `user_list` con `kind = 'top'`

Dos columnas nuevas: `lamina_format` (`top5`, `top10`, `grid9`) y `lamina_show_scores` (`boolean`, `false` por defecto). `CHECK`: `kind = 'top'`
si y solo si hay formato, y que el tipo de entidad sea `release-group` o `recording`.

- **Por qué:** hereda audiencia, moderación, exportación e ítems ordenados, y el filtro por `standard` la deja fuera de lo demás.
- **Alternativa:** tabla `lamina` con JSON. Reconstruir esas piezas no se justifica; la tier list podrá sumar una columna en el ítem.

El tope de ítems (5, 10 o 9) se aplica en el servicio, dentro de una transacción con bloqueo de la fila de la lista: es una regla entre filas.
Bajar de formato con más ítems conserva los primeros y avisa antes.

### 2. Notas apagadas por defecto

`lamina_show_scores` nace en `false`. Encenderla es un gesto explícito, como marcar una valoración: la Lámina muestra la nota vigente de cada
ítem con su puntaje, y solo a quien puede ver la Lámina. Un ítem sin valorar va sin nota. Compartir nunca abre una nota en silencio.

### 3. Rutas propias

`/me/laminas` y `/me/laminas/<id>` para gestionar, `/users/<u>/laminas/<id>` para leer, `/api/me/laminas` para escribir. "Lámina" y no "top": la
tier list usará las mismas rutas. Entrada en el menú de cuenta.

### 4. Editor

Lista ordenada con botones subir y bajar, operables con teclado y toque; arrastrar queda como mejora, no como requisito. Búsqueda con
`useTargetSearch`, filtrada por el tipo de la Lámina. Vista previa de la imagen en la página.

### 5. Formatos

`SHARE_FORMATS` suma `post` y `square`. Los objetivos declaran los suyos: `ShareTarget.formats`, con el primero por defecto. Top 5 y Top 10
dan `post`; Grilla, `square`; todas además `link` y `story`. Pedir un formato que el objeto no tiene responde `VALIDATION_ERROR`.

`SharePayload` pasa de `imageUrl` y `storyImageUrl` a `images: { format, url }[]`, y `ShareFormatPicker` recibe esa lista. Es un cambio en cuatro
lugares (`sharePayloadFor`, `own.ts`, `commentSharePayload`, hoja), más simple que sumar un campo por formato.

`TopFrame` guarda el cuerpo de cada formato. En Historia, el mismo cuerpo dentro de los márgenes seguros.

### 6. Tope de carátulas

ADR nuevo: una Lámina armada por una persona puede juntar hasta 10 carátulas, con las condiciones del ADR 0049. El tope sigue en 4 para lo
que el sistema compone solo. El límite sigue en el código: el objetivo recorta al máximo del formato.

### 7. Lo propio

`rating` y `listen` son `OWN_SHARE_KINDS`; se suma `top`. El gesto pone `audience = 'public'`, como en una escucha.

### 8. Feed

La fuente `list` del feed filtra por `standard`. Se amplía a `top` con entrada propia ("publicó una Lámina"), con la audiencia de la Lámina,
excluyendo las privadas. Una Lámina vacía no entra.

## Risks / Trade-offs

- **[El ADR amplía el uso de carátulas]** → sigue limitado a lo que arma una persona, con créditos y retiros. No es una opinión legal: si un sello
  lo objeta, el tope se baja en un solo lugar.
- **[`images` cambia un contrato interno]** → solo lo usan la hoja y sus pruebas.
- **[Títulos largos en el Top 10]** → recorte a dos líneas, ya visto en las muestras.
- **[Bajar de formato pierde ítems]** → se avisa antes de guardar.
- **[Tiempo de imagen]** → un Top 10 junta 10 carátulas remotas en frío: se mide, y una carátula que no llega sale como recuadro, con caché corta.

## Migration Plan

`0083` en scratch durante el cambio. En la BD real va después de `0079` a `0082`.

## Open Questions

Ninguna.
