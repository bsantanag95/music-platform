# Jerarquía de contenido — el álbum como unidad cultural

**Estado:** 🟢 Dirección conceptual cerrada e implementada.
**Fuente:** replanteo `redefine-content-hierarchy` (2026-09). La exploración completa —el
razonamiento descartado, las alternativas, las preguntas abiertas resueltas una por una—
vive en `openspec/changes/redefine-content-hierarchy/{proposal,design}.md`. Este documento
es el destilado durable para `docs/`.
**Relación:** extiende `vision.md` y `product_philosophy.md`; es la fuente de la que
derivan los feature specs de `05-features/` (`activity-feed.md`, `user-profile.md`,
`listening-diary-and-ratings.md`, `explore.md`, `onboarding.md`, `home.md`).

---

## 1. El problema

La comparación fundacional con Letterboxd (`vision.md`) tiene una grieta: **Letterboxd
tiene una unidad — la película — y en música hay tres** (artista, álbum, canción). El
modelo original trataba a las tres con el **mismo peso**: sobre cualquiera se puede
valorar, comentar, marcar favorito, poner en listas, registrar en el diario y destacar en
el perfil, exactamente igual.

Ese modelo simétrico produce síntomas concretos:

- **Identidad de producto difusa.** Sin una unidad cultural central, el producto se lee
  como "otro Last.fm" en lugar de "Letterboxd para música".
- **Feed sin relieve.** Un rating de álbum sin texto y una escucha de canción sin nota
  pesan lo mismo.
- **Perfil sin narrativa.** Los destacados mezclan los tres tipos sin decir qué representa
  cada uno.
- **Sin descubrimiento.** El catálogo solo se alcanza por búsqueda; no hay superficie
  editorial que establezca al álbum como obra.

Dos alternativas se descartaron:

- **Modelo A — simétrico** (`artista = álbum = canción`): simple, no aliena a nadie, pero
  produce todos los síntomas de arriba.
- **Modelo B — álbum-céntrico estricto** (`álbum > canción > artista`): da identidad
  clara pero sesga géneros (perjudica pop / hip-hop / electrónica / latino de singles),
  se siente elitista y añade fricción al usuario casual.

## 2. Modelo C — el rol se asigna a la acción, no a la entidad

**El catálogo y las interacciones no se restringen.** Se puede seguir valorando,
reseñando y registrando artistas, álbumes y canciones por igual. Lo que cambia es **qué
modo de relación presenta la UI como primario por defecto** en cada entidad.

Existen **dos modos de relación** usuario ↔ contenido, ambos disponibles sobre las tres
entidades:

```
  MODO OBRA  (sin tiempo, editable, uno por par)   MODO CONSUMO  (con fecha, append-only, ilimitado)
  ┌────────────────────────────────────┐           ┌────────────────────────────────────┐
  │ rating vigente                     │           │ entrada de diario                  │
  │ reseña (título + cuerpo + rating)  │           │  · target: artista | álbum | canción│
  │ favorito (toggle, audiencia)       │           │  · fecha, contexto, reacción, nota  │
  │ ítem de lista                      │           │  · audiencia                       │
  └────────────────────────────────────┘           └────────────────────────────────────┘
```

| Entidad | Primario (empujado) | Secundario (disponible, no prominente) |
|---|---|---|
| **Álbum** | Obra: valorar + reseñar | Consumo: registrar la sesión completa |
| **Canción** | Consumo: registrar + reaccionar | Obra: valorar (tras "más"), favorito |
| **Artista** | Exploración + seguir | Obra: nota / contexto (sin veredicto), favorito |

Regla: **los álbumes explican quién es culturalmente el usuario; las canciones explican
cómo vive la música día a día; el artista es la unidad de descubrimiento.**

El **objeto crítico del álbum es el `release-group`**: todo rating, reseña, favorito e
ítem de lista de "álbum" apunta ahí. Las ediciones (deluxe, remaster, regional) son un
selector de tracklist en la página, no objetos valorables distintos.

## 3. Separación obra ↔ evento de consumo (principio transversal)

`Obra → Opinión` (una, editable) es **independiente** de `Obra → Escucha → evento
temporal` (ilimitadas, append-only):

- Borrar una escucha no toca el rating; cambiar el rating no toca las escuchas.
- Una escucha nueva de un álbum ya valorado **no** re-emite el rating en el feed.
- En el perfil, "en rotación" (derivado del diario) ≠ "álbumes favoritos" (curado).

Resuelve la diferencia estructural entre música y cine: no hace falta re-evaluar una obra
cada vez que se vuelve a consumir. Un álbum se valora una vez y se escucha durante años.

## 4. El modelo de cuatro capas

La arquitectura resultante son **cuatro capas** que el producto conecta pero **no
confunde**:

```
  IDENTIDAD  →  álbumes favoritos · artistas seguidos · himno · destacados
  OBRA       →  álbum · canción · artista · rating · reseña
  CONSUMO    →  entradas de diario · actividad temporal · "en rotación"
  SOCIAL     →  feed · convergencia de red · comentarios · descubrimiento
```

| Naturaleza de actividad | Pregunta | Dónde vive |
|---|---|---|
| **Personal** | ¿Qué hice yo? | diario, rastro reciente y "En rotación" del perfil |
| **Social** | ¿Qué hizo cada persona que sigo, en orden? | listado cronológico de `/me/feed` |
| **Relevante** | ¿En qué coincide mi red ahora? | panel de convergencia en `/me/feed` |
| **Automática** | Derivada sin acción explícita | franja "También en tu red" al pie de `/me/feed` (tier 4) |

### Seis separaciones que deben sostenerse en el modelo de datos y en la UI

| # | Separación | Consecuencia |
|---|---|---|
| 1 | Identidad ≠ consumo | elegir un álbum favorito no es una escucha |
| 2 | Consumo ≠ opinión | registrar una escucha no toca el rating |
| 3 | Opinión ≠ conversación | una `review` no es un `comment` |
| 4 | Popularidad ≠ convergencia | que algo sea popular no significa que tu red lo escuche |
| 5 | Recencia ≠ frecuencia | una escucha reciente no es, por sí sola, "en rotación" |
| 6 | Álbum ≠ canción | varias canciones de un álbum → relación con la obra; una canción repetida → no |

### La UI revela la señal, no la aplana

**No convertir cada señal de usuario en una interacción social nueva.** Cada relación
tiene su frase y su superficie:

| Señal | Frase | Superficie |
|---|---|---|
| Preferencia | "me gusta" | favorito, reacción |
| Identidad | "esto me representa" | álbumes favoritos, destacados, himno |
| Consumo | "estoy escuchando esto" | diario, "en rotación" |
| Crítica | "tengo algo que decir sobre esta obra" | reseña de álbum, rating |
| Actividad | "esto es lo que hice" | rastro reciente, feed |
| Pico | "esto se volvió temporalmente un patrón" | fila-síntesis "En rotación" (7 días, feed) |

## 5. Decisiones de producto resueltas

Principio rector: la pregunta no es *"¿cómo hacemos que los álbumes aparezcan más?"* sino
*"¿cómo hacemos que cada entidad tenga una razón clara para existir y una interacción
natural?"* — y el éxito se mide por si `álbum→crítica`, `canción→hábito`,
`artista→descubrimiento` se vuelven intuitivos **sin explicarlos en la UI**.

| Q | Decisión |
|---|---|
| **Usuario objetivo** | Audiencia amplia con identidad cultural álbum-led. No elitista para consumidores de álbumes, pero tampoco competir con Spotify como plataforma de consumo de canciones. La diferenciación es la *relación consciente* con la música, no el formato. |
| **Rating de canción** | Se mantiene, degradado a secundario tras la reacción cualitativa (`liked`/`loved`/`obsessed`/`neutral`/`disliked`). No se elimina en Fase 1; se mide antes de cualquier retirada. |
| **Diario** | Manual, intencional y explícito — *"tu registro personal de experiencias musicales"*, nunca *"historial automático de escuchas"*. Importación desde streaming, fuera de alcance. |
| **`review`** | Entidad propia (tabla `reviews`), distinta de `comment`. Larga, editable, con rating asociado, peso social alto. Puede reutilizar UI/infra de `comment` pero no depende de ese modelo. En Fase 1 la escritura se restringe a álbumes en la capa de validación, no en el esquema. |
| **Seguir artista** | Relación unilateral usuario → artista, separada del seguimiento usuario → usuario. En Fase 1 solo alimenta afinidad, descubrimiento y organización personal. Notificaciones de lanzamiento, fuera de alcance (el esquema las deja preparadas). |
| **Perfil** | Sección nueva y separada **"Álbumes favoritos"** (identidad cultural, álbum-led, hasta 6, orden manual, sin ranking), por delante de los destacados mixtos que se conservan. El himno se conserva. |
| **Onboarding** | Dos puertas complementarias: "elegí entre 3 y 5 álbumes que te definen" (→ Álbumes favoritos, sin rating ni diario automáticos) y "¿qué estás escuchando ahora?" (→ primera entrada de diario). Ninguna obligatoria. |
| **Descubrimiento** | Ruta `/[locale]/explore` como contenedor conceptual; Fase 1 abre en una experiencia centrada en álbumes. Arranque en frío con curaduría semilla + reglas de catálogo + curaduría editorial mínima (que no debe volverse dependencia operativa diaria). |
| **Feed** | Jerarquía de 4 tiers de intención (expresivo / señal de opinión / presencia cotidiana / ambiente), reseña como fuente tier 1, pico de rotación personal (7 días), convergencia de red (≥3 personas de tu red + misma obra + 7 días), y una franja de eventos ambiente al pie. |

## 6. Secuencia de implementación

`redefine-content-hierarchy` corrió como un replanteo transversal posterior a la Fase 5
del roadmap principal, con su propia numeración interna:

```
  Fase 0  Precondiciones (bloqueante)
          · canonicalización de release-group (deluxe/remaster/regional; recopilatorios/en vivo/box sets)
          · contenido semilla del descubrimiento
          · modelado de `review` como entidad propia
     │
     ▼
  Fase 1  Descubrimiento de álbumes + rebalanceo de páginas de detalle
          + reorganización de perfil + onboarding de dos puertas
     │
     ▼
  Fase 2  Tiers del feed + seguir artista + pico de rotación + convergencia de red + eventos ambiente
     │
     ▼
  Fase 3  Profundización del diario (audiencia por intención, vocabulario, cronología)
```

**Estado:** las tres fases están implementadas y archivadas (16 cambios OpenSpec, más
`add-profile-featured-reviews` y `reframe-anon-landing-album-forward` como remates). Ver
`openspec/changes/archive/` y las secciones correspondientes en `05-features/`.

**Por qué este orden.** Lo diferenciado y defendible es "crítica + social alrededor del
álbum", hacia donde el código ya estaba ~80 %. La capa de hábito (diario) es retención
table-stakes pero no es la identidad; no debe dominar el roadmap hasta que exista
comunidad.

## 7. Diferido a fases posteriores

- Curva de decaimiento sofisticada de "en rotación" (half-life / exponencial).
- Tercera escala temporal de rotación: hábitos a ~1 año.
- Ponderación por tipo de interacción en la convergencia de red (reseña > registro).
- Notificaciones de lanzamiento para "seguir artista".
- Importación de escuchas desde servicios de streaming.
- Reseñas de canción / artista como superficie prominente.
- Eventos tier 4 interleaved en el listado cronológico (hoy van en una franja aparte).
