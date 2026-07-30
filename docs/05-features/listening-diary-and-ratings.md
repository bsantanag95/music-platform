# Diario de escucha y valoraciones — principios de diseño para Fase 4/5

**Estado:** Propuesta (input de diseño, no artefacto OpenSpec todavía)
**Fases relacionadas:** Fase 4 (`auth, ratings y comentarios`) y Fase 5 (`listas y actividad social`) del roadmap.
**Relación con la documentación existente:** extiende `01-domain/business-rules.md` y `03-data/sql-model.md`, no los contradice. No introduce cambios de schema todavía — es el razonamiento previo a escribir la migración correspondiente.

## 1. El problema que este documento intenta resolver

El PRD y la visión del producto ya establecen que la unidad de valor no es "reproducir", es **registrar y opinar sobre lo que ya escuchaste** (`00-product/vision.md`). Pero hay una asimetría estructural entre cine y música que el modelo de datos actual (`rating` como valoración única y vigente por objetivo) no captura todavía:

- Una película es un evento cerrado: se ve una vez, se opina, se cierra el ciclo.
- Un álbum se escucha decenas o cientos de veces, y **la opinión cambia con la exposición repetida** — eso no es un caso raro, es el comportamiento normal de un oyente.

Copiar el modelo de "una valoración vigente" sin más pierde justamente el dato más interesante del dominio musical: la evolución de una opinión sobre un mismo objetivo a través del tiempo.

Este documento no propone reemplazar `rating` — esa tabla sigue siendo necesaria y correcta como fuente de verdad de "la opinión actual de un usuario sobre un objetivo" (agregados, promedios, la card visible en el perfil). Propone **añadir una capa de registro histórico** que hoy no existe, y usar esa capa como eje del producto en lugar del catálogo.

## 2. Principio rector

> El usuario no entra a la app a consultar metadatos. Entra a registrar algo que acaba de sentir.

Esto tiene una consecuencia técnica directa: el flujo principal de la aplicación no es `catálogo → objetivo → formulario de rating`, es `objetivo recién escuchado → impresión rápida → (opcional) estructura`. El formulario de valoración dual completo (estrellas + 1-100, coherentes entre sí, ya validado a nivel de base según `sql-model.md`) sigue existiendo, pero deja de ser el primer paso — pasa a ser un paso opcional, tardío, dentro de un flujo que empieza con texto libre corto.

## 3. Extensión propuesta al modelo de datos

### 3.1 Nueva entidad: `listen_entry` (diario de escucha)

Una entidad **append-only** (nunca se actualiza in-place, solo se insertan filas nuevas), independiente de `rating`, que registra cada momento en que un usuario quiere dejar constancia de una escucha sobre un objetivo (artista, álbum o canción — mismo patrón polimórfico que `rating`/`comment`, con el mismo `CHECK (num_nonnulls(...) = 1)`).

Columnas conceptuales:

- `user_id`, y exactamente uno de `artist_id` / `release_group_id` / `recording_id` (mismo patrón que `rating` y `comment`).
- `listen_context`: enum — `first_listen`, `relisten`, `rediscovery`. Resuelve la distinción "primera escucha / después de varias escuchas / álbum al que vuelvo siempre" que pide la filosofía, sin inventar un concepto nuevo de dominio: es metadata de la entrada del diario, no del objetivo.
- `body`: texto corto, opcional, sin mínimo de extensión — el caso de uso es "este bajo está ridículamente bueno", no una reseña de Pitchfork.
- `stars`: opcional, mismo rango y pasos que `rating.stars` (0.5–5) si el usuario decide puntuar esa entrada puntual.
- `created_at`.

A diferencia de `rating`, **no hay índice único parcial por (usuario, objetivo)** — un usuario puede tener tantas `listen_entry` sobre el mismo álbum como escuchas quiera registrar. Esto es justamente lo que permite reconstruir algo como:

```
Kid A
Escucha #1  ★★★☆☆  "No entendí nada."
Escucha #4  ★★★★☆  "Ahora empiezo a captar la atmósfera."
Escucha #12 ★★★★★  "Es de mis discos favoritos."
```

### 3.2 Relación entre `listen_entry` y `rating`

`rating` sigue siendo, sin cambios, "la valoración vigente" — la regla de negocio existente (`business-rules.md`: *"Un Usuario solo puede tener una Valoración vigente por objetivo — una nueva valoración reemplaza a la anterior"*) no se toca. Lo que cambia es de dónde puede originarse esa actualización:

- Hoy: el usuario edita `rating` directamente.
- Propuesto: al crear una `listen_entry` con `stars`, la UI puede ofrecer *"¿Actualizar tu valoración a esta?"* como acción explícita y opcional — nunca automática. Si el usuario confirma, se hace el upsert normal sobre `rating` (mismo trigger `trg_rating_touch`, mismo CHECK de coherencia estrellas/detallada si además pone valoración detallada en ese momento).

Esto preserva la garantía de integridad que ya existe a nivel de base (una valoración vigente, coherente, por objetivo) mientras permite el historial que la filosofía pide, sin que ambas cosas compitan por ser "la fuente de verdad": `rating` responde *"¿qué opina hoy?"*, `listen_entry` responde *"¿cómo llegó a opinar eso?"*.

### 3.3 Por qué no extender `rating` en su lugar

Se consideró (y se descarta) quitar el índice único de `rating` y dejar que acumule historial directamente. Se descarta porque:

- Rompería agregados existentes y futuros (promedio de valoraciones por álbum) que asumen una fila vigente por usuario — habría que filtrar siempre por "la más reciente", moviendo esa lógica a cada query en vez de resolverla con un constraint de base.
- El CHECK de coherencia estrellas/valoración-detallada tiene sentido para *una* valoración vigente; forzarlo sobre entradas de diario sueltas (donde puede no haber valoración detallada nunca) le agrega fricción a un flujo que la filosofía pide mantener liviano.

Dos tablas con responsabilidades distintas es más simple que una tabla con dos responsabilidades.

## 4. El flujo de interacción propuesto (post-escucha)

Orden de pasos, todos menos el primero opcionales:

1. **Marcar como escuchado** (crea la `listen_entry`, sin fricción — puede ser un solo tap).
2. **Impresión corta** (texto libre, sin mínimo).
3. **Contexto de escucha** (`first_listen` / `relisten` / `rediscovery` — puede inferirse por defecto si es la primera `listen_entry` del usuario sobre ese objetivo, y el usuario solo lo corrige si quiere).
4. **Estrellas** (opcional, sobre la entrada puntual).
5. **¿Actualizar tu valoración vigente?** (solo aparece si puso estrellas, y solo si difiere de `rating.stars` actual).

Este orden es deliberado: la reseña (paso 2) va antes que la nota (paso 4), invirtiendo el orden habitual del formulario de valoración dual. El formulario completo de estrellas + valoración detallada (`01-domain/business-rules.md`) sigue existiendo tal cual está especificado, pero como una acción explícita separada ("editar mi valoración"), no como parte obligatoria de este flujo rápido.

## 5. Feed de actividad

Depende de las entidades sociales que el roadmap ya deja para Fase 5 (`Actividad`, en `domain-model.md`), pero se puede anticipar qué eventos lo alimentan una vez existan `listen_entry` y el grafo social:

- Nueva `listen_entry` (con o sin texto/estrellas).
- Cambio de `rating.stars` respecto al valor anterior (el caso "★★★☆☆ → ★★★★★, cinco años después por fin me hizo clic" requiere guardar el valor previo antes del upsert — se resuelve leyendo la última `listen_entry` con estrellas sobre ese objetivo antes de la actualización, sin necesitar una tabla de auditoría aparte).
- Nuevo `comment`.

El feed no necesita una tabla propia de eventos materializados desde el día uno: puede construirse como una unión ordenada por `created_at` de `listen_entry` + `rating` (por `updated_at`) + `comment`, filtrada por a quién sigue el usuario. Materializar un feed de eventos aparte es una optimización a evaluar solo si el volumen lo justifica en Fase 5, no un prerequisito de diseño.

## 6. Identidad de perfil

La filosofía pide que un perfil responda preguntas ("¿qué álbum te define?", "¿qué artista siempre defendés?"), no que muestre gráficos. Técnicamente esto son **queries agregadas sobre datos existentes**, no columnas nuevas que haya que mantener sincronizadas:

- *Álbum definitorio*: el `release_group` con más `listen_entry` del usuario, o el de mayor `rating.stars` sostenido en el tiempo (varias `listen_entry` con estrellas altas espaciadas en meses).
- *Artista que siempre defiende*: el `artist_id` con mayor promedio de `rating.stars` entre los créditos con más de N valoraciones del usuario.
- *Descubrimiento del año*: `artist`/`release_group` con `listen_entry(listen_context = 'first_listen')` dentro del rango de fecha, filtrado por valoración alta.
- *Obsesión del mes*: objetivo con más `listen_entry` en los últimos 30 días.

Ninguna de estas requiere una tabla nueva — son candidatas a vistas o queries cacheadas, a decidir cuando se implemente el perfil en Fase 4/5.

## 7. Descubrimiento social basado en personas

En vez de un motor de recomendación algorítmico (explícitamente fuera de alcance según `00-product/vision.md`: *"No introducirá recomendaciones algorítmicas agresivas tipo 'para ti'"*), el patrón "gente que amó X también amó Y" se resuelve como una query de co-valoración: usuarios con `rating.stars` alto sobre el objetivo A, ordenados por cuántos de ellos también tienen `rating.stars` alto sobre el objetivo B. Es descubrimiento pasivo por señal social real, coherente con la diferenciación de producto ya definida frente a Spotify/Apple Music.

## 8. Qué no decide este documento

Deliberadamente fuera de alcance aquí (para no anticipar decisiones que corresponden a un ADR o a un change de OpenSpec cuando se implemente):

- Nombre final y columnas exactas de la migración `NNNN_listen_entry.sql`.
- Si `listen_context` es un enum en base o se infiere solo en la aplicación.
- Si el feed se materializa o se computa on-demand — depende de volumen real, no se puede decidir sin datos de uso.
- Diseño de UI del flujo de 5 pasos descrito en la sección 4.

## 9. Próximo paso sugerido

Este documento es material de entrada para un change de OpenSpec cuando se aborde Fase 4 (el `listen_entry` mínimo, sin feed ni identidad de perfil) y otro más adelante para Fase 5 (feed + agregados de perfil + descubrimiento social). No se recomienda implementar las tres cosas juntas: `listen_entry` con flujo rápido es el único componente que el MVP de Fase 4 necesita para no perder la filosofía descrita; el resto depende de que exista el grafo social que hoy no existe.
