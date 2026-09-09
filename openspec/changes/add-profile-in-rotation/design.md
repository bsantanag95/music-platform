## Context

`redefine-content-hierarchy` resolvió (OQ2 / IQ1 / IQ2, decisión D10) que el perfil tenga
una sección dinámica **"En rotación"** derivada exclusivamente del diario. Este cambio la
implementa para Fase 1.

Estado actual relevante:

- `listen_entry` (capability `listen-diary`): objetivo polimórfico
  `artist_id | release_group_id | recording_id` (`CHECK num_nonnulls = 1`), `created_at`,
  `audience` (`private | followers | public`, default `followers`), `listen_context`
  (`first_listen | relisten | rediscovery`). Append-only, es el registro de consumo.
- `taste-fingerprint` (`src/services/profiles/stats.ts`) es el precedente exacto de "señal
  de perfil calculada bajo demanda": `cache()` por request, `getProfileByUsername` +
  `audiencesForProfile`, devuelve `null` sin acceso, sin tabla materializada, con endpoint
  espejo `GET /api/users/[username]/fingerprint`.
- Una `recording` **no** tiene FK directa a `release_group`: la relación es
  `track → release → release_group` y es de muchos-a-muchos (una canción puede estar en
  varias ediciones y varios álbumes/compilados).
- El perfil ya siguió el patrón "insertar la sección nueva sin reordenar el resto" en
  `redesign-profile-album-identity`.

## Goals / Non-Goals

**Goals:**

- Sección de perfil que muestre las **canciones** y **álbumes** que el dueño ha estado
  escuchando en los últimos 30 días, ordenados por un score de recencia + frecuencia.
- Cálculo `señales → score → estado` sobre eventos crudos de `listen_entry`, con umbrales
  ajustables sin migración.
- Filtrado por audiencia del diario idéntico a `listUserDiary` / `taste-fingerprint`.
- Presentación de tono cultural: sin contadores, sin exponer el algoritmo.
- Mínima superficie: una sección insertada, cero reordenamientos, cero migraciones.

**Non-Goals:**

- Curva de decaimiento sofisticada (half-life / exponencial) — Fase 2 si los datos la
  justifican (IQ2).
- El **pico de rotación** en el feed (fila-síntesis a 7 días, OQ5 / D9) — es otro cambio.
- La sección **"Rastro reciente"** (item 6 del orden vertical Q7) — otro cambio.
- Tabla materializada, job de recálculo, o cache entre requests.
- Señal a partir de reacciones, favoritos o valoraciones.
- Onboarding (`add-two-door-onboarding`) — depende de este cambio pero es aparte.

## Decisions

### D1 — Solo `listen_entry`, nunca opinión

El cálculo lee **únicamente** `listen_entry`. No importa `rating`, `favorite`, `review` ni
`reaction`. Una reacción/favorito es un juicio ("me gusta"), no un hecho de consumo
reciente ("lo estoy escuchando"). El módulo no importa esas tablas; un test estructural lo
verifica (mismo criterio que la independencia diario/rating).

*Alternativa descartada:* mezclar "loved recientemente" como boost. Ensucia la semántica y
hace la sección impredecible.

### D2 — `señales → score → estado` sobre eventos crudos

Aunque en Fase 1 el score es una suma ponderada simple, se modela explícitamente en tres
pasos para que los umbrales cambien sin tocar la arquitectura ni migrar:

1. **Señales**: filas de `listen_entry` del dueño, visibles para el lector, con
   `created_at >= now() - 30 días`. Cada fila es `{ createdAt, target (song|album), kind }`
   donde `kind ∈ { song_listen, album_listen }` (una fila con `artist_id` se ignora — el
   artista es demasiado grueso para "en rotación").
2. **Score** por entidad: `Σ pesoRecencia(createdAt)`, con pesos discretos por tramo:
   - `0–7 días`: **3** (actividad actual)
   - `8–21 días`: **2** (reciente)
   - `22–30 días`: **1** (residual)
   - `> 30 días`: fuera de la ventana → no contribuye
   Un `album_listen` explícito cuenta **×2** frente a un `song_listen` (intención del
   usuario = señal fuerte; IQ1).
3. **Estado "en rotación"**: la entidad entra si su score `>= UMBRAL_EN_ROTACION` (Fase 1:
   `3` — equivale a una escucha en la última semana, dos hace dos semanas, o tres residuales).
   Se muestran hasta **8** entidades por tipo, ordenadas por score desc, `createdAt` del
   evento más reciente desc como desempate.

Todos los pesos y umbrales viven como **constantes nombradas** en el módulo del servicio
(`ROTATION_WINDOW_DAYS`, `RECENCY_WEIGHTS`, `ALBUM_LISTEN_MULTIPLIER`,
`ROTATION_SCORE_THRESHOLD`, `ROTATION_MAX_PER_TYPE`), no dispersos en el SQL.

### D3 — Canciones = señal primaria; álbumes = agrupación contextual

La sección tiene dos bloques: **Canciones** (primario, arriba) y **Álbumes** (contextual,
abajo). Un bloque no se renderiza si está vacío; la sección entera no se renderiza si ambos
lo están.

- **Bloque Canciones**: se puntúan directamente las filas `recording_id` de `listen_entry`.
- **Bloque Álbumes** — dos fuentes de señal (IQ1, heurística **experimental**):
  - **Directa**: filas `release_group_id` de `listen_entry` (registro explícito del álbum),
    peso `album_listen`.
  - **Derivada (roll-up canción→álbum)**: filas `recording_id` mapeadas al release-group
    de la canción. Regla de desambiguación (una canción puede estar en varios): entre los
    release-groups de categoría `studio` en que aparece la canción (vía `track → release →
    release_group`), el de `first_release_date` más temprano (nulls al final,
    `first_release_year` como segundo criterio, `id` como tercero). Una canción sin
    release-group `studio` **no** aporta al bloque Álbumes (sí al bloque Canciones).
    El roll-up usa peso `song_listen` (no `album_listen`).
  - **Anti-repetición**: repetir 5× la misma canción **no** mete su álbum en rotación por
    volumen. Se logra contando, para el roll-up derivado, **canciones distintas** del
    álbum (cada canción del álbum aporta como máximo su propio score de canción una vez al
    score del álbum), no cada escucha. Un `album_listen` explícito sí cuenta cada vez.

*Alternativa descartada para el roll-up:* atribuir la canción a **todos** sus
release-groups. Infla compilados y "greatest hits". La regla de "studio + más temprano"
sesga hacia el álbum original, coherente con `canonicalize-release-group`.

### D4 — Filtrado por audiencia idéntico al diario

`getProfileByUsername(username, viewerId)` → si `!accessible` devolver `null`.
`audiencesForProfile(profile)` → si vacío devolver `null`. Las señales se filtran con
`listen_entry.audience IN (audiencias visibles)` (para el dueño, `relation = "self"` →
todas). Consecuencia: la misma persona puede tener "en rotación" distinto para un seguidor
que para un visitante público, y la sección desaparece para quien no ve ninguna entrada.
Idéntico a `listUserDiary`.

### D5 — Presentación sin métricas, tono cultural

- Canciones: título + artista acreditado + enlace a `/song/{id}`. Álbumes: carátula +
  título + artista + enlace a `/album/{id}`.
- **No se muestra** el score, el número de escuchas, "hace X días", ni ningún porcentaje.
- Encabezado de sección "En rotación"; subtítulos "Canciones" / "Álbumes".
- Orden interno por score desc, pero **sin numerar** ni mostrar posiciones.
- Sin estado "racha", sin emojis de fuego, sin "escuchaste esto N veces".

### D6 — Ubicación en el perfil: insertar, no reordenar

Nueva `InRotationSection` en `sections.tsx`. En `page.tsx`:

- **Vista pública de dos columnas**: columna principal, **después de `PinnedSection`,
  antes de `FingerprintSection`**.
- **Vista del dueño (una columna)**: **después de `ShowcaseSection`, antes de
  `FingerprintSection`**.

Coincide con el orden vertical Q7 (5. En rotación, entre 3–4. destacados y 8. huella). No
se toca ningún otro `<Streamed>`.

### D7 — Endpoint espejo, sin fetcher dedicado

`GET /api/users/[username]/in-rotation` devuelve el mismo objeto que consume la sección
(o `404` `USER_NOT_FOUND` si el perfil no existe; `{ inRotation: null }` si no hay acceso o
no hay actividad, igual que `fingerprint` devuelve su forma "vacía"). Zod:
`InRotationResponseSchema`. No hay fetcher en `src/lib/api/` porque nada cliente lo consume
en Fase 1 (mismo criterio que `fingerprint`, que tampoco tiene fetcher propio salvo el uso
de página).

### D8 — Cálculo bajo demanda con `cache()`

`export const getProfileInRotation = cache(async (username, viewerId) => …)`. La página y
el endpoint comparten el resultado dentro del request. Sin materialización: el volumen
(filas de diario de un usuario en 30 días) es chico y los índices
`idx_listen_entry_user_created` + los de objetivo cubren la consulta.

## Risks / Trade-offs

- **[El diario manual nunca es un registro completo de consumo]** → La sección se presenta
  como "lo que anotaste últimamente", no "lo que más escuchaste". El copy y la ausencia de
  métricas lo dejan claro. Es un highlight reel, no analítica.
- **[La heurística de álbum es tosca en Fase 1]** → Está declarada como experimental en la
  spec (no definición de producto). Los umbrales son constantes ajustables; el modelo
  `señales → score → estado` permite iterar sin migrar. Aceptamos falsos negativos (álbum
  que "debería" estar y no aparece) antes que falsos positivos.
- **[Roll-up canción→álbum puede elegir el álbum "equivocado" para canciones muy
  versionadas]** → La regla determinista (studio + más temprano) es explicable y estable.
  Un error acá degrada a "el álbum correcto no aparece", no a datos incorrectos.
- **[Tercer mecanismo dinámico del perfil, además de recencia y — futuro — rastro]** → "En
  rotación" (30 d, curado por score) y "Rastro reciente" (cronológico, otro cambio) tienen
  copy y forma distintos: uno es "qué suena", el otro "qué hiciste". La línea de recencia
  del aside es sólo una fecha.
- **[Coste de la consulta en perfiles con diario grande]** → Acotado a 30 días y a un
  `user_id`; `cache()` evita el doble cálculo página+endpoint. Si más adelante pesa, la
  arquitectura `señales → score → estado` admite materializar sin cambiar la interfaz.

## Migration Plan

Sin migración de base de datos. Despliegue directo: el servicio y el componente son
aditivos; si `getProfileInRotation` fallara, sólo esa sección desaparece (su `<Streamed>`
tiene su propio boundary). Rollback = revertir el commit.

## Open Questions

- **OQ1 — ¿El roll-up canción→álbum entra en Fase 1 o se difiere? → RESUELTA: entra.**
  Con la regla de desambiguación de D3 (canción → primer release-group de estudio; el álbum
  acumula señal de **canciones distintas**, no de reproducciones de una misma pista). Sin
  el roll-up el bloque Álbumes quedaría casi siempre vacío. Es heurística experimental,
  ajustable.
- **OQ2 — ¿Umbral y ventana exactos? → RESUELTA: se mantienen los valores propuestos.**
  Ventana 30 d; pesos de recencia 3 (0–7 d) / 2 (8–21 d) / 1 (22–30 d); señal explícita de
  álbum ×2; umbral de aparición 3; máx 8 por bloque. Constantes con nombre, deliberadamente
  simples — la prioridad de la primera versión es validar que la sección produzca una
  representación reconocible de "lo que esta persona está escuchando últimamente", no
  optimizar la fórmula. Se calibran después con datos reales, sin cambio de spec.
