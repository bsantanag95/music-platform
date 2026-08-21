# Diario de escucha y valoraciones — principios de diseño para Fase 4/5

**Estado:** Propuesta actualizada por el cambio `add-listen-diary-reactions` (Fase 5.3): la base
de `listen_entry` con reacción emocional y diario propio queda definida allí; este documento
conserva el razonamiento de producto de fondo.
**Fases relacionadas:** Fase 4 (`auth, ratings y comentarios`) y Fase 5 (`presencia, favoritos y actividad social`) del roadmap.
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

### 2.1 Arquitectura de dos capas: presencia y criterio

El principio rector de arriba se resuelve, a nivel de producto, en dos capas separadas que **nunca se obligan entre sí**:

**Capa de presencia** — registro de que algo sonó, sin ninguna decisión de valor de por medio. Cero fricción. Se alimenta de dos formas, ambas dentro de Fase 5:

- *Manual* ("marcar como escuchado", un tap, sin rating): el primer paso, sin dependencia de ninguna integración externa — funciona igual para quien escucha por streaming, CD o vinilo, no solo para quien conecta una cuenta de Spotify o Apple Music.
- *Automática* (scrobbling vía las Web APIs de esos proveedores, ya anotado como posibilidad futura en ADR 0001): una mejora sobre el registro manual, nunca su reemplazo — quien nunca conecta una cuenta de streaming sigue teniendo una capa de presencia completa a través del registro manual.

**Capa de criterio** — el usuario decide que algo le importó y lo marca explícitamente. Dos escalones de fricción creciente, ambos opcionales, ninguno obligatorio para llegar al siguiente:

- *Favorito* (Fase 5, extendido a artista, álbum y canción — hoy `domain-model.md` solo lo define sobre artista): un tap, sin escala. Responde "esto me importó" sin exigir cuantificarlo.
- *Rating + Comentario* (Fase 4, ya definido en `ratings-and-reviews.md`): fricción completa, reservada a lo que el usuario decide que merece estrellas, valoración detallada o unas palabras.

```
CAPA DE PRESENCIA                    CAPA DE CRITERIO
(automática o manual,                (siempre manual, siempre opcional)
 cero fricción)

Marcar como escuchado      ──┐
  (Fase 5, manual)            │
                              ├──►   Favorito (un tap)
Scrobbling                    │         │
  (Fase 5, automático,        │         ▼
   mejora sobre lo manual) ───┘      Rating + Comentario
                                      (fricción completa,
                                       reservado a lo que
                                       "merece un lugar
                                       en tu historia")
```

**Por qué separarlas resuelve la tensión entre uso masivo y uso de nicho.** Ninguna capa obliga a la otra, y eso es lo que permite que el mismo producto sirva a dos perfiles de uso sin que uno sabotee al otro:

- Un usuario puede tener presencia activa (historial visible, alimentando el feed social de quienes lo siguen) sin haber valorado nunca nada. Ese uso es igual de válido que el de alguien que valora todo — sostiene el pilar social del PRD ("ver qué escuchan otros"), que necesita volumen real de gente para no ser un feed vacío.
- Un usuario puede usar la capa de criterio con intensidad — construir su ranking personal, escribir reseñas — sin que eso tenga ninguna relación obligatoria con cuánto marcó como escuchado.

Es la misma dinámica que sostiene a Letterboxd en la práctica: la mayoría de las cuentas registran películas sin escribir una sola reseña, y son tan válidas como las que sí lo hacen. El "prestigio" de la capa de criterio es opcional, nunca la puerta de entrada al producto.

Este principio — no hace falta opinar sobre todo lo que escuchaste, solo sobre lo que te dejó algo — está declarado como filosofía de producto en `00-product/vision.md`, no solo como una decisión de este documento: condiciona cualquier función futura (nada de rachas, contadores de pendientes ni medallas por completitud), no solo el diseño del flujo puntual descrito en la sección 4.

## 3. Extensión propuesta al modelo de datos

### 3.1 Nueva entidad: `listen_entry` (diario de escucha)

Una entidad **append-only** (nunca se actualiza in-place, solo se insertan filas nuevas), independiente de `rating`, que registra cada momento en que un usuario quiere dejar constancia de una escucha sobre un objetivo (artista, álbum o canción — mismo patrón polimórfico que `rating`/`comment`, con el mismo `CHECK (num_nonnulls(...) = 1)`).

Columnas conceptuales:

- `user_id`, y exactamente uno de `artist_id` / `release_group_id` / `recording_id` (mismo patrón que `rating` y `comment`).
- `listen_context`: enum — `first_listen`, `relisten`, `rediscovery`. Resuelve la distinción "primera escucha / después de varias escuchas / álbum al que vuelvo siempre" que pide la filosofía, sin inventar un concepto nuevo de dominio: es metadata de la entrada del diario, no del objetivo.
- `body`: texto corto, opcional, sin mínimo de extensión — el caso de uso es "este bajo está ridículamente bueno", no una reseña de Pitchfork.
- `reaction`: opcional, ausencia de dato (`NULL`) o una de `liked` (`Me gustó`), `loved` (`Me encantó`), `obsessed` (`Obsesión`), `neutral` (`Neutro`), `disliked` (`No me gustó`). Es la gramática de *sensación* de la escucha, independiente del idioma (los textos se resuelven en i18n). **Reemplaza deliberadamente las estrellas** para no usar la misma gramática visual de `rating` en dos lugares con significados distintos: `rating` expresa valoración numérica vigente; `listen_entry` expresa presencia y sensación.
- `audience`: `private`, `followers` o `public`, con default `followers`.
- `created_at`.

A diferencia de `rating`, **no hay índice único parcial por (usuario, objetivo)** — un usuario puede tener tantas `listen_entry` sobre el mismo álbum como escuchas quiera registrar. Esto es justamente lo que permite reconstruir algo como:

```
Kid A
Escucha #1  (sin reacción)   "No entendí nada."
Escucha #4  Me gustó         "Ahora empiezo a captar la atmósfera."
Escucha #12 Obsesión         "Es de mis discos favoritos."
```

### 3.2 Relación entre `listen_entry` y `rating`

`rating` sigue siendo, sin cambios, "la valoración vigente" — la regla de negocio existente (`business-rules.md`: *"Un Usuario solo puede tener una Valoración vigente por objetivo — una nueva valoración reemplaza a la anterior"*) no se toca.

`listen_entry` es **totalmente independiente** de `rating`: no lleva nota numérica ni estrellas, y ninguna mutación de una entrada crea, modifica ni elimina la valoración vigente del objetivo. La reacción emocional de una escucha (ej. `loved`) no es una puntuación y nunca se ofrece como "actualizar tu valoración a esta" — no existe una conversión entre la gramática de sensación y la gramática numérica.

Esto preserva la garantía de integridad que ya existe a nivel de base (una valoración vigente, coherente, por objetivo) mientras permite el historial que la filosofía pide, sin que ambas cosas compitan por ser "la fuente de verdad": `rating` responde *"¿qué opina hoy?"*, `listen_entry` responde *"¿qué sintió en ese momento?"*.

### 3.3 Por qué no extender `rating` en su lugar

Se consideró (y se descarta) quitar el índice único de `rating` y dejar que acumule historial directamente. Se descarta porque:

- Rompería agregados existentes y futuros (promedio de valoraciones por álbum) que asumen una fila vigente por usuario — habría que filtrar siempre por "la más reciente", moviendo esa lógica a cada query en vez de resolverla con un constraint de base.
- El CHECK de coherencia estrellas/valoración-detallada tiene sentido para *una* valoración vigente; forzarlo sobre entradas de diario sueltas (donde puede no haber valoración detallada nunca) le agrega fricción a un flujo que la filosofía pide mantener liviano.

Dos tablas con responsabilidades distintas es más simple que una tabla con dos responsabilidades.

## 4. El flujo de interacción propuesto (post-escucha)

Orden de pasos, todos menos el primero opcionales:

1. **Marcar como escuchado** (crea la `listen_entry`, sin fricción — puede ser un solo tap; ver también sección 2.1, capa de presencia manual).
2. **Impresión corta** (texto libre, sin mínimo).
3. **Contexto de escucha** (`first_listen` / `relisten` / `rediscovery` — puede inferirse por defecto si es la primera `listen_entry` del usuario sobre ese objetivo, y el usuario solo lo corrige si quiere).
4. **Reacción emocional** (opcional, sobre la entrada puntual: `liked` / `loved` / `obsessed` / `neutral` / `disliked`, o ausencia).
5. **Audiencia** (opcional; por defecto `followers`, editable a `private` o `public`).

Este orden es deliberado: la impresión (paso 2) va antes que la reacción (paso 4), invirtiendo el orden habitual del formulario de valoración dual. El formulario completo de estrellas + valoración detallada (`01-domain/business-rules.md`) sigue existiendo tal cual está especificado, pero como una acción explícita separada ("editar mi valoración"), no como parte de este flujo rápido — una escucha no alimenta ni requiere el rating.

## 5. Feed de actividad

Depende de las entidades sociales que el roadmap ya deja para Fase 5 (`Actividad`, en `domain-model.md`), pero se puede anticipar qué eventos lo alimentan una vez existan `listen_entry` y el grafo social:

- Nueva `listen_entry` (con o sin texto/reacción).
- Cambio de `rating.stars` respecto al valor anterior (el caso "★★★☆☆ → ★★★★★, cinco años después por fin me hizo clic" requiere guardar el valor previo antes del upsert — se resuelve leyendo el valor vigente de `rating` sobre ese objetivo antes de la actualización, sin necesitar una tabla de auditoría aparte).
- Nuevo `comment`.
- Nuevo `favorito` (una vez extendido a álbum y canción según sección 2.1).

El feed no necesita una tabla propia de eventos materializados desde el día uno: puede construirse como una unión ordenada por `created_at` de `listen_entry` + `rating` (por `updated_at`) + `comment` + `favorito`, filtrada por a quién sigue el usuario. Materializar un feed de eventos aparte es una optimización a evaluar solo si el volumen lo justifica en Fase 5, no un prerequisito de diseño.

## 6. Identidad de perfil

La filosofía pide que un perfil responda preguntas ("¿qué álbum te define?", "¿qué artista siempre defendés?"), no que muestre gráficos. Técnicamente esto son **queries agregadas sobre datos existentes**, no columnas nuevas que haya que mantener sincronizadas:

- *Álbum definitorio*: el `release_group` con más `listen_entry` del usuario, o el de mayor `rating.stars` sostenido en el tiempo (varias `listen_entry` con reacción `liked`/`loved`/`obsessed` espaciadas en meses).
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
- Columnas y schema exactos de `favorito` extendido a álbum/canción (sección 2.1) — mismo criterio: es material de entrada para el change de OpenSpec de Fase 5, no una decisión de este documento.
- Diseño exacto de la integración OAuth con Spotify/Apple Music para la presencia automática (sección 2.1) — no tiene todavía ni ADR ni análisis de rate limits; queda pendiente antes de poder implementarse, aunque no bloquea la presencia manual.

La taxonomía de reacción y las columnas de `listen_entry` **sí están decididas** (Fase 5.3,
change `add-listen-diary-reactions`): reacción `liked`/`loved`/`obsessed`/`neutral`/`disliked`/ausencia
con textos i18n, y columna `audience` con default `followers`.

## 9. Próximo paso sugerido

La base de `listen_entry` (presencia manual + diario propio) es el cambio de Fase 5.3
(`add-listen-diary-reactions`). Los incrementos posteriores de Fase 5 (capa de presencia automática,
favoritos extendidos, feed y agregados de perfil) dependen del grafo social ya existente y se
abordarán como cambios propios. No se recomienda implementar todo junto: `listen_entry` con flujo
rápido es el único componente que la capa de presencia necesita para no perder la filosofía descrita.
