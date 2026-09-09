## Context

`rework-feed-tiers` dejó el feed con:

- `feedEntryTier(entry): 1 | 2 | 3 | 4` (`src/components/feed/feed-entry-tier.ts`).
- `groupFeedRuns(entries: FeedEntry[]): FeedRow[]` (`src/components/feed/feed-grouping.ts`),
  donde `FeedRow = FeedEntry | FeedEntryGroup`. Pliega corridas de **3+ entradas
  consecutivas** del mismo `kind`, mismo `tier` (2 o 3) y mismo `author.id`. `GROUP_MIN = 3`.
  Las entradas tier 1 cortan la corrida.
- `FeedActivityList.tsx` mapea `groupFeedRuns(entries)` y renderiza `GroupRow` para
  `kind: "group"`. `GroupRow` de escuchas usa el verbo `t("groupListens", { count })` y
  lista hasta 4 títulos enlazados.
- `FeedActivityList` es `"use client"`; ya se apoya en `useNow()` de next-intl a través de
  `RelativeDate` (`feed-row-parts.tsx`) para fechas relativas estables entre SSR e
  hidratación.

`redefine-content-hierarchy` D9 / OQ5 define el **pico de rotación**: cuando una corrida
colapsada del tier 3 es del **mismo objetivo** (no solo del mismo tipo), se presenta como
síntesis de comportamiento — *"En rotación · Song A · 5 registros esta semana"* — a 7 días,
espejo de la sección "En rotación" del perfil (`profile-in-rotation`) que corre a 30 días.
La Fase 1 implementa solo esas dos capas.

`profile-in-rotation` ya fijó, para su cálculo de 30 días: solo `listen_entry`, nunca
opinión; el artista es demasiado grueso para "en rotación"; tono cultural sin métricas de
gamificación. Este cambio adopta los mismos principios a 7 días y en el feed.

## Goals / Non-Goals

**Goals:**

- Una corrida colapsada de escuchas sin nota del mismo autor **y del mismo objetivo** que
  acumula suficientes registros en 7 días se presenta como una fila de pico de rotación,
  con el título enlazado y la cuenta de la semana, en vez de la fila genérica de grupo.
- Umbrales como constantes con nombre, calibrables sin cambio de spec.
- Aplica en las tres superficies de `FeedActivityList` (`/me/feed`, preview de Inicio,
  rastro reciente `self`), con la variante `self` sin nombre de autor.
- Cero cambios de datos, servicio, API, contrato REST o i18n de otras namespaces.

**Non-Goals:**

- **Convergencia de la red** (varias personas de tu red sobre la misma obra, IQ4 / D9) —
  es `add-network-convergence`.
- **Eventos ambiente tier 4 en el feed** (seguir artista/usuario, colección) — otro cambio.
- Tocar la sección "En rotación" del perfil (30 d) ni su servicio.
- Convertir el pico del feed en una analítica exacta: solo ve corridas **consecutivas
  dentro de la página cargada**. El cálculo fiel de ventana es el del perfil.
- Pico de rotación para ratings o favoritos de canción: el pico es sobre **registros**
  (escuchas), no sobre opinión.
- Nueva fuente de datos, materialización o job.
- Reacción como `kind` de feed independiente (hoy la reacción es un campo de la escucha).

## Decisions

### D1 — El pico es una refinación de una corrida ya detectada, no una consulta nueva

`groupFeedRuns` sigue detectando la corrida maximal de `kind: "listen"`, tier 3, mismo
autor, entradas consecutivas (misma lógica actual). **Después** de aislar esa corrida,
evalúa si califica como pico:

1. Todas las entradas de la corrida comparten `target.id` (⇒ también `target.type`).
2. `target.type` es `recording` o `release-group` (nunca `artist`).
3. La cantidad de entradas de la corrida con `createdAt >= now - ROTATION_PEAK_WINDOW_DAYS`
   alcanza el umbral por tipo:
   - `recording` → `>= ROTATION_PEAK_MIN_SONG` (Fase 1: **3**)
   - `release-group` → `>= ROTATION_PEAK_MIN_ALBUM` (Fase 1: **2**)

Si califica ⇒ emite una fila `FeedRotationPeak`. Si no ⇒ el flujo actual: si
`run.length >= GROUP_MIN` emite `FeedEntryGroup`, si no emite las entradas sueltas.

*Constantes* (`feed-grouping.ts`, junto a `GROUP_MIN`): `ROTATION_PEAK_WINDOW_DAYS = 7`,
`ROTATION_PEAK_MIN_SONG = 3`, `ROTATION_PEAK_MIN_ALBUM = 2`.

*Alternativa descartada:* un segundo pase sobre todo el feed contando por objetivo sin
importar consecutividad. Daría una cuenta más fiel pero (a) duplica lo que ya hace el
perfil a 30 d, (b) rompe el modelo "el pico es una lectura de una corrida visible", (c)
obliga a mirar entradas fuera de la página. El feed muestra lo evidente en contexto; la
analítica está en el perfil.

### D2 — El pico de álbum puede formarse por debajo de `GROUP_MIN`

Una corrida de **2** escuchas consecutivas del mismo álbum, ambas dentro de 7 días, es un
pico de álbum, aunque `GROUP_MIN` sea 3 para el plegado genérico. Repetir un álbum completo
dos veces en una semana es en sí la señal fuerte (D9: *"repetir un álbum completo es mucho
menos frecuente que repetir una canción"*). Sin esto, ese caso quedaría como dos filas
"registró una escucha de X" y la señal se perdería.

Implicación en `groupFeedRuns`: para escuchas, la corrida maximal se calcula igual, pero la
rama de decisión evalúa el pico **antes** del corte `run.length >= GROUP_MIN`. Una corrida
de 2 escuchas de canción del mismo tema **no** es pico (umbral 3) y sigue mostrándose como
dos filas sueltas.

*Alternativa descartada:* bajar `GROUP_MIN` a 2 para corridas del mismo objetivo. Cambiaría
el comportamiento del grupo genérico (2 escuchas de temas distintos se colapsarían) — más
invasivo y fuera de alcance.

### D3 — La cuenta mostrada es la de la ventana de 7 días

El copy es *"{N} registros esta semana"* y `N` es la cantidad de entradas de la corrida con
`createdAt` dentro de los 7 días. Si la corrida tiene entradas más antiguas (p. ej. 6
escuchas del mismo tema, 4 esta semana y 2 de hace tres semanas), la fila dice *"4 registros
esta semana"* y absorbe igualmente las 2 viejas (son el mismo tema; la fila describe el
patrón, no enumera eventos). Una corrida cuya cuenta en ventana no alcanza el umbral no es
pico y cae al grupo genérico (que sí cuenta todas las entradas).

### D4 — `FeedRotationPeak` como tercer miembro de `FeedRow`

```ts
export interface FeedRotationPeak {
  kind: "rotation-peak";
  id: string;                 // `peak-${target.type}-${firstEntry.id}` (estable para React)
  target: {
    type: "recording" | "release-group";
    id: string;
    title: string;
    artistName: string | null;
  };
  count: number;              // registros en la ventana de 7 días
  author: FeedEntry["author"];
  createdAt: string;          // el más reciente de la corrida (ISO), para el marcador de tiempo
}

export type FeedRow = FeedEntry | FeedEntryGroup | FeedRotationPeak;
```

`FeedActivityList` añade una rama `row.kind === "rotation-peak"` en el `.map`, antes de la
rama `"group"`.

### D5 — Presentación: fila subordinada con la misma anatomía que `GroupRow`

- Misma ubicación visual que `GroupRow`: fila **indentada a la columna del título**, **sin
  celda** de carátula, subordinada (la actividad de rotación se lee como contexto, no como
  evento destacado).
- **Línea de metadato** (mismo patrón que `GroupRow`): `[avatar + autor ·] En rotación · {N}
  registros esta semana`, con el marcador de tiempo relativo a la derecha (`RelativeDate`,
  `createdAt`). En `self` se omite el `[autor ·]`.
- **Debajo**, el **título del objetivo enlazado** a `/song/{id}` o `/album/{id}`
  (`targetHref`) con el artista acreditado al lado si existe — igual que `GroupRow` pone sus
  títulos en un `<p>` bajo la línea de metadato, solo que acá es un único título.
- **No se muestra**: el algoritmo, un porcentaje, "hace X días por registro", ni ninguna
  barra de progreso. Sin emoji de fuego, sin "racha", sin exclamaciones.
- Clave i18n `rotationPeak`, **sin el título dentro** (el título es un enlace aparte),
  `plural` sobre `count`:
  - es: `"En rotación · {count, plural, one {# registro} other {# registros}} esta semana"`
  - en: `"In rotation · {count, plural, one {# log} other {# logs}} this week"`

### D6 — Ventana temporal: `now` inyectable, `useNow()` en producción

`groupFeedRuns(entries, now = new Date())`. `FeedActivityList` pasa `useNow()` (ya
disponible vía next-intl; el mismo valor estable que usan las fechas relativas), evitando
`ENVIRONMENT_FALLBACK` y desajuste de hidratación. Los tests inyectan un `now` fijo.

### D7 — Mismas reglas de corte que una corrida

El pico es estrictamente **consecutivo**: una entrada tier 1 (comentario, reseña, nota de
escucha, evento de lista), una escucha de otro objetivo, u otro autor, cortan la corrida y
por lo tanto el pico. `song A, song A, comentario, song A` ⇒ no hay corrida de 3 ⇒ no hay
pico. Es la consecuencia natural de D1 y mantiene el modelo predecible; la subestimación
respecto de la realidad es aceptable (ver Non-Goals; la cuenta fiel está en el perfil).

### D8 — Alcance idéntico al resto de la jerarquía de presentación

Aplica en `/me/feed`, en el preview de feed de seguidos de Inicio y en el rastro reciente
`self` — las tres superficies de `FeedActivityList`. Es coherente con la sección "En
rotación" del perfil: la del perfil es la lectura a 30 días, esta es la lectura a 7 días en
el flujo de actividad.

## Risks / Trade-offs

- **[El feed subestima la rotación real]** (solo corridas consecutivas de la página
  cargada) → Es deliberado (D1, Non-Goals). El pico del feed señala una racha evidente en
  contexto; el cálculo fiel de ventana vive en `profile-in-rotation`. El copy ("esta
  semana") no promete exhaustividad.
- **[Un tercer tipo de fila colapsada — grupo, pico, y — futuro — convergencia de red]** →
  Los tres tienen copy y forma distinguibles: el grupo lista títulos variados, el pico
  nombra un objetivo con "En rotación", la convergencia (otro cambio) nombra personas. La
  rama de render es explícita por `row.kind`.
- **[Confusión "En rotación" del feed vs del perfil]** → Es el mismo concepto a distinta
  escala (7 d / 30 d), a propósito. Mismo vocabulario ("En rotación"), sin exponer números
  de ventana al usuario en ninguna de las dos.
- **[Cambio de `now` entre SSR e hidratación]** → Se usa `useNow()` (estable dentro del
  request), igual patrón que `RelativeDate`. Un test de hidratación no aplica acá; los
  tests unitarios inyectan `now`.
- **[Pico de álbum de 2 se siente agresivo]** → Umbral en constante; si en datos reales
  produce ruido, se sube a 3 sin cambio de spec (la spec fija "≥ 2" como valor de Fase 1
  calibrable, no como invariante).

## Migration Plan

Sin migración de base de datos. Cambio puramente de presentación cliente. Despliegue
directo; si `groupFeedRuns` fallara, su `<Streamed>`/boundary de `FeedActivityList` ya
aísla el fallo a esa lista. Rollback = revertir el commit.

## Open Questions

- **OQ1 — ¿El pico de álbum se forma con una corrida de solo 2 escuchas (por debajo de
  `GROUP_MIN`), o exige 3+ como el grupo genérico? → RESUELTA: con 2** (D2). Repetir un
  álbum completo dos veces en una semana es la señal; forzarlo a 3 lo haría casi
  inalcanzable. Es un umbral en constante, ajustable sin cambio de spec.
- **OQ2 — ¿La cuenta mostrada es la de la ventana de 7 días o el total de la corrida? →
  RESUELTA: la de la ventana** (D3), coherente con "esta semana". Diferencia solo cuando la
  corrida tiene entradas de más de 7 días, un caso de borde; esas entradas viejas se
  absorben en la fila del pico igual (mismo tema, la fila describe el patrón).
