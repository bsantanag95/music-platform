## Context

### Estado actual

La Fase 5 dejó un sistema social completo pero **conceptualmente plano**. Sobre artista,
álbum y canción se pueden hacer hoy las mismas cosas con el mismo peso:

```
                 artista        álbum         canción
rating              ✓             ✓              ✓        (valor vigente, sin audiencia)
comentario          ✓             ✓              ✓
favorito            ✓             ✓              ✓        (toggle, con audiencia)
lista               ✓             ✓              ✓        (listas mono-tipo)
diario / escucha    ✓             ✓              ✓        (append-only)
destacado de perfil ✓             ✓              ✓        (4 pines mixtos)
```

Consecuencias observadas:

- **Identidad de producto difusa.** Sin una unidad cultural central, el producto se lee
  como "otro Last.fm" en vez de "Letterboxd para música".
- **Feed sin relieve.** `activity-feed` distingue peso por "tiene texto / no tiene texto",
  pero un rating de álbum sin texto y una escucha de canción sin nota pesan lo mismo.
- **Perfil sin narrativa.** `profile-showcase` mezcla los tres tipos en cuatro pines sin
  decir qué representa cada uno.
- **No hay descubrimiento.** El catálogo solo se alcanza por búsqueda (`catalog-search`,
  `header-search`); no existe superficie editorial que establezca al álbum como obra.

### Origen del replanteo

La comparación fundacional con Letterboxd falló porque Letterboxd tiene **una** unidad
(la película) y aquí hay tres. Dos hipótesis descartadas:

- **Modelo A — simétrico** (`artista = álbum = canción`): simple de construir y explicar,
  no aliena a nadie, pero produce exactamente los síntomas de arriba.
- **Modelo B — álbum-céntrico estricto** (`álbum > canción > artista`): da identidad
  clara pero sesga géneros (perjudica pop / hip-hop / electrónica / latino de singles),
  se siente elitista y añade fricción al usuario casual.

### Restricciones

- Sin migración destructiva del modelo de datos.
- Respetar la arquitectura de Fase 5 (Server Components, REST con Zod, audiencias,
  matriz de visibilidad bloqueo/privado/seguimiento).
- El catálogo se apoya en MusicBrainz: `release-group` → `release` → tracks → `recording`.
  Ya se resuelve la carátula a nivel `release-group` (`cover-art-resolution`,
  `catalog-album`).

## Goals / Non-Goals

**Goals:**

- Fijar un principio de arquitectura de información que asigne un trabajo distinto a cada
  entidad **sin restringir el catálogo ni las interacciones disponibles**.
- Formalizar la separación obra ↔ evento de consumo como principio transversal.
- Enumerar las superficies afectadas y la secuencia recomendada de cambios posteriores.
- Registrar las decisiones estratégicas bloqueantes y su recomendación.

**Non-Goals:**

- Escribir deltas de spec o implementar cualquier superficie (eso son cambios posteriores).
- Decidir el diseño visual concreto de la superficie de descubrimiento.
- Elegir el usuario objetivo definitivo (decisión de negocio; ver Open Questions).
- Construir importación de escuchas desde servicios de streaming.
- Tocar el modelo de audiencias, bloqueo o seguimiento entre usuarios.

## Decisions

### D1 — El rol se asigna a la acción, no a la entidad (Modelo C)

**Decisión.** Existen dos modos de relación usuario ↔ contenido, ambos disponibles sobre
las tres entidades:

```
  MODO OBRA  (sin tiempo, editable, uno por par)     MODO CONSUMO  (con fecha, append-only, ilimitado)
  ┌──────────────────────────────────────┐           ┌──────────────────────────────────────┐
  │ rating vigente                       │           │ entrada de diario                    │
  │ reseña (título + cuerpo + rating)    │           │  · target: artista|álbum|canción     │
  │ favorito (toggle, audiencia)         │           │  · fecha, contexto, reacción, nota   │
  │ ítem de lista                        │           │  · audiencia                         │
  └──────────────────────────────────────┘           └──────────────────────────────────────┘
```

La jerarquía vive en **qué modo presenta la UI como primario por defecto** en cada
entidad, nunca en qué modo permite:

| Entidad | Primario (empujado) | Secundario (disponible, no prominente) |
|---|---|---|
| Álbum | Obra: valorar + reseñar | Consumo: registrar sesión completa |
| Canción | Consumo: registrar + reaccionar | Obra: valorar (tras "más"), favorito |
| Artista | Exploración + seguir | Obra: nota/contexto (sin veredicto), favorito |

**Por qué C y no B estricto.** B asigna el rol a la entidad y convierte "reseñar una
canción" o "valorar un artista" en caminos que la UI estorba, alienando a un usuario
legítimo (el que piensa que un single es la obra del año). C da la misma identidad de
producto sin cerrar puertas.

**Alternativa considerada.** Restringir por entidad (solo álbumes se reseñan). Rechazada:
frágil ante la cultura de singles y difícil de revertir.

### D2 — Separación obra ↔ evento de consumo como principio transversal

**Decisión.** `Obra → Opinión` (una, editable) es independiente de
`Obra → Escucha → evento temporal` (ilimitadas, append-only). Borrar una escucha no toca
el rating; cambiar el rating no toca las escuchas. Ya es la semántica de `listen-diary`;
se eleva a principio y se aplica también al feed (una escucha nueva de un álbum ya
valorado **no** re-emite el rating) y al perfil ("en rotación" ≠ "álbumes favoritos").

**Por qué.** Resuelve la diferencia estructural entre música y cine: no hace falta
re-evaluar una obra cada vez que se vuelve a consumir. Un álbum se valora una vez y se
escucha durante años.

### D3 — El objeto crítico del álbum es el `release-group`

**Decisión.** Todo rating, reseña, favorito y ítem de lista de "álbum" apunta al
`release-group`. Las `releases` (deluxe, remaster, aniversario, regional, explícito/limpio)
son un **selector de edición** en la página del álbum que solo cambia el tracklist
mostrado. Casos especiales (recopilatorios, en vivo, splits, box sets) siguen siendo
`release-group` valorables, marcados con un badge de tipo.

**Por qué.** Una película tiene identidad canónica; un álbum no. Si la capa crítica se
apoya en el álbum, "¿qué es EL álbum?" tiene que estar resuelto antes que todo lo demás.
La app ya resuelve carátula a nivel `release-group`; esto extiende la misma abstracción a
lo social.

**Trade-off.** Perdemos la capacidad de valorar "la remaster de 2011" como cosa distinta
del original. Aceptable: es un caso de nicho y RYM tampoco lo hace bien.

### D4 — Reseña como objeto propio, distinto de comentario

**Decisión.** Nueva entidad `review` con **tabla propia `reviews`** (OQ4) — no `comment`
con discriminador. Campos previsibles: `id`, `user_id`, target, `rating`, `body`,
`created_at`, `updated_at`, metadata de edición/moderación; después: reacciones,
visibilidad, destacado, métricas. Un rating puede existir sin reseña; una reseña siempre
lleva rating. El `comment` permanece como unidad conversacional.

Relación: `Album → muchos Review`; `Review → (user, target, body, rating)`;
`Review → muchos comments`.

**Forma del target (IQ3) — decisión condicionada al roadmap:**

- **Si reseñas de canción/artista están en un horizonte cercano** → `target_type` +
  `target_id` desde el inicio, con **whitelist estricta** de targets permitidos (solo
  `album` en Fase 1). Evita una migración temprana.
- **Si NO están en roadmap real** → `album_id` obligatorio, más limpio, sin polimorfismo
  prematuro; la capa de dominio/API deja el concepto de "review target" preparado para
  evolucionar.

La decisión depende de la **facilidad técnica del stack** (Drizzle + PostgreSQL: un
`target_type/target_id` sin FK real complica integridad referencial, índices y cascadas),
no de UX. D4 sí fija que el producto **no asume conceptualmente** que solo los álbumes
reciben reseñas.

- **Álbum**: la reseña es acción primaria, con editor propio (no un campo de comentario
  más).
- **Canción**: permitida, no prominente.
- **Artista**: se presenta y se rotula como **"nota / contexto / empezá por aquí"**, sin
  estrella. Una opinión sobre un artista es una guía, no un veredicto.

**Infra compartida, dominio independiente.** `reviews` puede reutilizar componentes de
editor, moderación, validaciones, sistema de reacciones, renderizado y permisos de
`comment`, pero el objeto de dominio es propio y no depende conceptualmente de ese modelo.
Evita la tabla genérica `comment` con `type = review | reply | album_comment | …` y su
colección creciente de campos opcionales.

**Por qué.** Sin un objeto reseña de verdad, el álbum no tiene superficie crítica y el
producto no se diferencia del streaming.

### D5 — Rating de canción degradado a secundario; reacción cualitativa primaria

**Decisión.** En canción, el modo primario es la reacción
`liked / loved / obsessed / neutral / disliked` (ya existe en `listen-diary`). Las
estrellas quedan opcionales, detrás de un control "más". En álbum las estrellas siguen
primarias.

**Por qué.** `obsessed` describe mejor el vínculo de hábito con una canción que un
juicio crítico de 5 estrellas. No se elimina el rating de canción: se le baja el volumen.

**Alternativa considerada.** Quitar del todo las estrellas de canción. Rechazada por ahora:
irreversible y hay usuarios que las quieren; primero se prueba la degradación.

### D6 — Página de canción mínima

**Decisión.** La canción es entidad real pero su página es ligera: título, álbum(es) que
la contienen (prominente), tu historial de escuchas, reacción agregada. No es un destino
rico.

**Por qué.** Las páginas ricas de canción son caras (SEO, ingesta, dedup de `recording`
entre releases — el hack "carátula representativa" de `lists` ya muestra que los recordings
son un lío). Mantener la inversión donde está la identidad: el álbum.

### D7 — Nueva superficie de descubrimiento de álbumes

**Decisión (OQ3 resuelta).** Ruta **`/[locale]/explore`** (no `/albums`), como contenedor
conceptual de descubrimiento que responde "¿qué obras debería conocer?", separado del feed
("¿qué hace mi red?"). `explore` alojará con el tiempo álbumes, artistas, canciones,
listas, géneros, décadas y tendencias; **la Fase 1 abre directamente en una experiencia
centrada en álbumes** y el resto de categorías simplemente no están disponibles todavía.
Elegir `/explore` desde el principio evita una arquitectura de navegación fragmentada
(`/albums` + `/artists` + `/songs` + `/lists` migrada después). Organización de la
superficie de álbumes: novedades, populares, por género, por década, mejor valorados,
emergentes, destacados de la comunidad, curaduría editorial.

> **Revisión (cambio `add-community-lists-surface`).** El descubrimiento de **listas** se
> sacó de este contenedor y vive en ruta propia **`/[locale]/lists`**, enlazada aparte en la
> barra general del Header. Motivo: las listas son curaduría humana con identidad de
> navegación propia (patrón "Lists" de Letterboxd), no una faceta del catálogo. `/explore`
> sigue siendo el contenedor de álbumes/artistas/canciones/géneros/décadas; la spec
> `album-discovery` no cambia (nunca tuvo pestaña de listas).

**Arranque en frío (Q4 resuelta).** Las secciones de señal social ("mejor valorados",
"populares") requieren masa crítica. El día 1 la superficie se llena con tres fuentes:

1. **Curaduría semilla** — listas fijas: álbumes esenciales, esenciales por década,
   "empezá con este artista", "discos que definieron un género", obras recientes
   destacadas.
2. **Curaduría por reglas de catálogo** — mejor valorados, más añadidos a favoritos, más
   registrados, más reseñados, tendencias recientes (se activan cuando hay datos).
3. **Curaduría editorial mínima** — pocas colecciones ("5 álbumes para descubrir esta
   semana", "un esencial de cada década").

La curaduría editorial NO debe volverse una **dependencia operativa diaria**: el objetivo
es sembrar suficiente contenido para que la actividad de la comunidad alimente las
superficies después. Recomendable un feature flag hasta tener contenido semilla suficiente.

### D8 — Seguir artista (usuario → artista)

**Decisión.** Nueva relación unilateral usuario → artista, separada del seguimiento
usuario → usuario de `user-following`. En Fase 1 funciona **solo como señal de afinidad,
descubrimiento y organización personal**: personaliza el descubrimiento, prioriza artistas
relevantes, aparece como contexto en el perfil y alimenta afinidad. El evento de "seguir
artista" en el feed es tier 4 (ambiente).

**Fuera de alcance en Fase 1.** Notificaciones de nuevos lanzamientos: implican detección
periódica de releases, normalización, manejo de ediciones, falsos positivos, preferencias
y jobs periódicos — y acercan la app a un agregador de novedades. El modelo de datos SÍ
debe permitir incorporarlas después.

**Por qué.** Hoy no existe. Es la pieza que hace del artista una "unidad de
descubrimiento" real y no solo una página de contexto.

### D9 — Feed con jerarquía de eventos en 4 tiers

**Decisión.** Extender el criterio actual ("tiene texto / no") con una segunda dimensión
"entidad + tipo de acción":

| Tier | Contenido | Tratamiento |
|---|---|---|
| **1 — Expresivo** | reseña de álbum con texto · lista nueva o edición mayor · escucha con nota (cita) · comentario | tarjeta/cita completa, nunca colapsa, plegado "ver más" |
| **2 — Señal de opinión** | rating de álbum sin texto · favorito de álbum | fila media con carátula, agrupación leve |
| **3 — Presencia cotidiana** | escucha de canción sin nota · rating de canción · favorito de canción/artista · reacción | fila mínima, corridas de 3+ se colapsan |
| **4 — Ambiente / automático** | seguir artista · seguir usuario · entrada de colección física | agrupación agresiva o fuera del feed principal |

**Pico de rotación (OQ5 resuelta).** Cuando una corrida colapsada del tier 3 es del
**mismo objetivo** (no solo del mismo tipo), se presenta como una síntesis de
comportamiento, no como un evento repetido ni como un logro:

- Canción: **≥3 registros del mismo tema en 7 días** → una fila "En rotación · *Song A* ·
  5 registros esta semana".
- Álbum: **≥2 registros del mismo álbum en 7 días** (repetir un álbum completo es mucho
  menos frecuente que repetir una canción).

Tono cultural, no de gamificación: *"En rotación — Song A · 5 registros esta semana"*,
nunca *"🔥 ¡escuchaste esto 5 veces!"*. Es el mismo concepto "En rotación" que el perfil
(D10 / OQ2) a una escala temporal menor: **7 días en el feed, 30 días en el perfil**. La
Fase 1 implementa solo esas dos capas; una tercera (hábitos a 1 año) queda para después.

Además, cuatro naturalezas de actividad:

- **Personal**: todo lo tuyo → diario/perfil/rastro, sin filtro de audiencia para ti.
- **Social**: lo de tus seguidos, filtrado por audiencia → `/me/feed`.
- **Relevante**: subconjunto curado — reseñas + listas de seguidos, y **convergencia de la
  red** (ver abajo) → candidato a pestaña "Destacado".
- **Automática**: derivada sin acción explícita (seguir, colección) → tier 4, minimizada.

**Convergencia de la red (IQ4 resuelta).** Detecta que **varias personas de tu red están
teniendo simultáneamente una relación con la misma obra** — no popularidad global.
"5 personas que sigues están escuchando este álbum esta semana" vale mucho más socialmente
que "100 000 personas lo escucharon".

- Umbral: **≥3 personas distintas de tu red + misma obra + ventana de 7 días**.
- Cuenta como interacción (Fase 1, diario manual): entrada explícita de diario, rating,
  reseña o favorito. La actividad pasiva/importada pesaría menos, pero en Fase 1 no
  existe.
- Resultado en el feed: **una sola síntesis social** —"3 personas que sigues están
  escuchando *X* esta semana"— nunca tres filas sueltas (Ana escuchó X · Pedro calificó
  X · Juan escuchó X). Distinta del *pico de rotación* personal, que es sobre tu propio
  comportamiento.
- Pendiente de afinar en implementación: si los distintos tipos de interacción deben
  ponderarse (reseña > registro) o contar por igual.

### D10 — Perfil: identidad cultural (álbum-led) sobre hábito, con showcase mixto conservado

**Decisión (Q7 resuelta).** Se crea una sección **nueva y explícita "Álbumes favoritos"**,
liderada por álbumes, distinta de los destacados mixtos actuales. Los dos coexisten porque
cumplen funciones diferentes:

| Mecanismo | Representa | Contenido |
|---|---|---|
| **Álbumes favoritos** *(nuevo)* | identidad cultural, obras fundamentales, expresión crítica, relación duradera | **exactamente hasta 6 álbumes**, rejilla, orden manual (OQ1) |
| **Destacados** *(se conserva `profile-showcase`)* | identidad personal amplia, expresión emocional, diversidad | canción / artista / álbum / lista mezclados, hasta 4 |
| **Himno** *(se conserva)* | vínculo emocional con una canción | una canción |

**Álbumes favoritos — comportamiento (OQ1).** Tope fijo de 6 (no una colección abierta:
su función es una declaración de identidad, no otra biblioteca). Orden manual, reemplazo
libre de cualquier posición. **Nunca** se ordenan por rating, escuchas ni actividad; no
tienen que ser los mejor valorados; se pueden elegir sin haber escrito reseña. La sección
se lee como declaración personal, no como ranking. Rejilla 3×2.

Orden vertical del perfil (Q7):

```
  1. Identidad del usuario  (avatar · nombre · bio · contadores · himno)
  2. Álbumes favoritos (hasta 6)          ─┐ identidad cultural  (estable, curado, álbum-led)
  3. Destacados personales (mixtos, ≤4)    │
  4. Reseñas destacadas                   ─┘
  5. En rotación / Sonando últimamente    ─┐ cómo vive la música  (dinámico, derivado del diario)
  6. Rastro reciente                      ─┘
  7. Afinidad (visitante autenticado)      · favoritos · valoraciones altas · seguidores · artistas
  8. Huella de gusto                       · curva de ratings · décadas · géneros · reparto por tipo
  9. Exploración                           · artistas seguidos · artistas favoritos
 10. Accesos: diario completo · listas · colección · estadísticas
```

**En rotación — derivación (OQ2 / IQ1 / IQ2).** Se calcula **solo** desde la actividad
reciente del diario, nunca desde reacciones, favoritos ni ratings (una reacción dice
*"me gusta"*, no *"lo estoy escuchando ahora"*). Cálculo bajo demanda, sin tabla
materializada (como `taste-fingerprint`). No se muestra el algoritmo al usuario.

- **Arquitectura: `señales → score → estado "en rotación"`.** Aunque en Fase 1 el score
  sea trivialmente simple, la lógica se modela como un puntaje sobre eventos de escucha
  (`timestamp + entidad + tipo de evento`), no como un umbral hard-codeado. Así los
  umbrales se ajustan después sin migrar datos ni tocar la arquitectura.
- **Ventana: 30 días, con pesos discretos por recencia** (no half-life ni curva
  exponencial en Fase 1 — innecesario y más difícil de implementar/depurar/explicar):
  `0–7 d` actividad actual · `8–21 d` reciente · `22–30 d` residual · `>30 d` sin nueva
  actividad → sale de rotación. La sofisticación de la curva de decaimiento se difiere a
  Fase 2 si los datos la justifican.
- **Jerarquía de presentación**: canciones = señal primaria; álbumes = agrupación
  contextual.
- **Álbum en rotación — heurística inicial (IQ1, experimental, no definición de
  producto)**: entra si en 30 días hay **≥3 canciones distintas del álbum registradas**
  *o* **≥2 registros explícitos del álbum completo**. El registro explícito del álbum
  desde el diario pesa más que una canción suelta (intención del usuario = señal fuerte).
  Repetir 5× la misma canción de un álbum **no** lo mete en rotación — eso es repetición
  de canción, no relación con la obra. Dos escuchas completas de un álbum de 10 temas es
  señal más fuerte que 3 canciones distintas una vez; el score debe reflejar eso aunque
  los primeros umbrales sean toscos.

Regla: **los álbumes explican quién es culturalmente el usuario; las canciones explican
cómo vive la música día a día.**

**Riesgo de diseño (nuevo).** El perfil pasa a tener tres mecanismos de fijado —álbumes
favoritos, destacados, himno—. La Fase 1 debe hacer que "álbum favorito" y "álbum fijado
como destacado" se lean como cosas obviamente distintas (copy, ubicación, affordance), o
el usuario no sabrá cuál usar.

### D11 — Diario como capa de consumo pura

**Decisión.**

- **No lleva opinión.** El rating y la reseña viven en el modo Obra.
- **Intensidad inferida, no declarada.** El sistema deriva "tap" vs "experiencia" de
  (entidad canción/álbum) × (hay nota/reacción) × (contexto). No se le pide al usuario que
  clasifique.
- **Audiencia por defecto según intención**: escucha sin nota ni reacción → `private`
  (es para ti); con nota o reacción → `followers`. Hoy el default es `followers` siempre.
- **El feed solo recibe** entradas que superan un umbral de intención (nota o reacción) o
  con audiencia explícita.
- **Vista de línea de tiempo por mes** además de la lista, para que se sienta historial y
  no log.
- **Renombrar** "Marcar como escuchado" → "Registrar escucha" / "Anotar en el diario".
  "Escuchado" implica un checkbox de completitud; se busca lo contrario (y `home`,
  `profile-showcase`, `taste-fingerprint` ya prohíben rachas y medallas de completitud —
  se extiende ese instinto).

### D12 — Secuencia de implementación

```
  Fase 0  Precondiciones  ── bloqueante
          · canonicalización de release-group (D3): reglas para
            deluxe/remaster/regional y para recopilatorios/en vivo/box sets
          · contenido semilla del descubrimiento (D7 / Q4)
          · modelado de `review` como entidad propia (D4 / Q5)
     │
     ▼
  Fase 1  Descubrimiento de álbumes  +  rebalanceo de páginas de detalle
          +  reorganización de perfil  +  onboarding de dos puertas
          (expresa la identidad, riesgo bajo, no toca modelo de datos salvo `review`)
     │
     ▼
  Fase 2  Tiers del feed  +  seguir artista (solo afinidad/descubrimiento)
     │
     ▼
  Fase 3  Profundización del diario  (último — no antes de tener comunidad)
```

Las decisiones de negocio Q1–Q7 quedan resueltas (ver sección "Resolved Questions"), por
lo que la Fase 0 es puramente técnica/operativa.

**Por qué este orden.** Lo diferenciado y defendible es "crítica + social alrededor del
álbum", hacia donde el código ya está ~80%. La capa de hábito (diario) es retención
table-stakes pero no es la identidad; no debe dominar el roadmap hasta que exista
comunidad.

## Risks / Trade-offs

- **[El producto intenta ser RYM + Last.fm + Letterboxd a la vez]** → Priorizar por
  secuencia (D12) la intersección crítica+social. Aceptar que la capa de hábito es
  ligera y personal, no un competidor de Last.fm.

- **[El diario manual de canciones nunca será un registro completo de consumo]** → Diseñar
  para "highlight reel" elegido, no para completitud. UI explícita de que el diario es un
  registro intencional. No introducir métricas de volumen/racha.

- **[Sesgo de género hacia música de álbum]** → El Modelo C mantiene todas las
  interacciones sobre canción; el descubrimiento incluye singles/EPs; el onboarding no
  fuerza la puerta cultural (Q1). La diferenciación es "la relación consciente con la
  música", no el formato consumido.

- **[Tres mecanismos de fijado en el perfil confunden]** (álbumes favoritos / destacados
  mixtos / himno, Q7) → Fase 1: copy y affordances que distingan "favorito" de "fijado";
  ubicación y jerarquía visual claras.

- **[Comentarios con dos orígenes tras `review` como entidad]** (Q5) → un comentario puede
  colgar de la obra o de una reseña; el tier 1 "comentario" del feed debe enlazar al
  contexto correcto y no mezclarlos.

- **[Arranque en frío del descubrimiento]** → Fallback editorial y datos de catálogo
  (novedades, décadas, géneros) que no dependen de señal de comunidad (D7).

- **[Canonicalización de `release-group` mal resuelta rompe la capa crítica]** → Fase 0
  bloqueante; reglas explícitas para deluxe/remaster/regional y para
  recopilatorios/en vivo/box sets antes de tocar la página de álbum.

- **[Confusión entre "escuchar / registrar / valorar / reseñar"]** → Vocabulario de UI
  distinto e inequívoco para cada acción; auditar todos los copies de Fase 5.

- **[Demasiados tipos de interacción sobrecargan la UI]** → En cada página, un solo modo
  primario visible; el resto detrás de "más". La canción, en particular, con página
  mínima (D6).

- **[Regresión de expectativas: usuarios que valoran canciones con estrellas]** → D5
  degrada, no elimina; medir uso antes de cualquier retirada.

- **[Cambio de default de audiencia del diario expone o esconde de más]** → Aplicar solo a
  entradas nuevas; comunicar el cambio; permitir override en el momento de crear.

## Migration Plan

No hay migración de datos en este cambio (es exploración). Para los cambios posteriores:

- **Aditivo primero**: tabla `artist_follow`, tabla propia `reviews` (Q5 + OQ4), sin
  borrar `rating` de canción.
- **Rollback**: cada fase de D12 es un cambio OpenSpec independiente y reversible por sí
  mismo. La Fase 1 es puramente de presentación y se puede revertir sin tocar datos.
- **Feature flag** recomendado para la superficie de descubrimiento hasta tener contenido
  editorial suficiente.

## Resolved Questions

Resueltas por decisión de producto. Principio rector de la Fase 1: la pregunta no es
*"¿cómo hacemos que los álbumes aparezcan más?"* sino *"¿cómo hacemos que cada entidad
tenga una razón clara para existir y una interacción natural?"* — y el éxito se mide por
si `álbum→crítica`, `canción→hábito`, `artista→descubrimiento` se vuelven intuitivos sin
explicarlos en la UI.

| Q | Decisión Fase 1 |
|---|---|
| **Q1 — Usuario objetivo** | **Audiencia amplia con identidad cultural album-led.** No elitista para consumidores de álbumes, pero tampoco competir con Spotify como plataforma de consumo de canciones. La diferenciación es la *relación consciente* que el usuario construye con su música, no el formato. |
| **Q2 — Rating de canción** | **Mantener degradado y medir.** Primario en canción: reacción cualitativa. Secundario y opcional: rating numérico. No eliminar en Fase 1. Métricas a observar: % que califica canciones, relación rating↔reacción, canciones con rating pero nunca registradas, canciones con múltiples registros sin rating, uso por cohortes. Retirar solo si los datos muestran redundancia o confusión. |
| **Q3 — Diario** | **Manual, intencional y explícito.** El Diario responde "¿qué escucha el usuario y decidió recordar?", no "¿qué escuchó?". La UI lo presenta como *"tu registro personal de experiencias musicales"*, nunca como *"historial automático de escuchas"*. Registro rápido pero siempre por acción intencional. |
| **Q3b — Importación de escuchas** | **Fuera de alcance en Fase 1.** Evaluable después como fuente complementaria / sync opcional / datos para estadísticas / sugerencias de registro. No define el comportamiento central. |
| **Q4 — Arranque en frío** | **Lanzar con contenido semilla** (curaduría semilla + reglas de catálogo + curaduría editorial mínima, ver D7). La curaduría editorial NO debe ser dependencia operativa diaria. |
| **Q5 — `review`** | **Entidad propia y explícita.** Ciclo de vida distinto al de `comment`: larga, editable, con rating asociado, peso social alto, destacable, compartible, con fecha de publicación, puede recibir `comments`. Puede reutilizar UI/infra de `comment` pero no depender conceptualmente de ese modelo. Jerarquía: `Album → muchos Review`; `Review → (usuario, target, texto, rating)`; `Review → muchos comments`. Forma del target: ver IQ3. |
| **Q6 — Seguir artista** | **Afinidad, descubrimiento y organización personal.** Notificaciones de lanzamientos explícitamente fuera de alcance; el modelo de datos debe permitir añadirlas después. |
| **Q7 — Álbumes favoritos** | **Sección nueva y separada**, liderada por álbumes. Los destacados mixtos de `profile-showcase` se conservan como capa secundaria más flexible (canción / artista / álbum / lista). El himno se conserva. Ver D10. |

### Onboarding de dos puertas (Q1)

No son dos tipos de usuario incompatibles, son dos entradas complementarias:

- **Construir identidad inicial** — "elegí entre 3 y 5 álbumes que te definen" → señal
  cultural inicial, alimenta perfil, recomendaciones y descubrimiento. Responde *"¿qué
  música te representa?"*.
- **Registrar el presente** — "¿qué estás escuchando ahora?" → entrada inmediata a la
  experiencia cotidiana, sin exigir reflexión previa. Responde *"¿qué está pasando contigo
  ahora?"*.

Ambas disponibles; ninguna obligatoria; se pueden completar en cualquier orden o más tarde.

**Los álbumes del onboarding SON los álbumes favoritos (IQ5).** "¿Qué álbumes te definen?"
y "¿cuáles son tus álbumes favoritos?" son la misma pregunta — no se crea una colección
temporal aparte. El usuario elige 3–5 (o salta), y quedan como `3–5 / 6` espacios de
Álbumes favoritos; el sexto se añade luego desde el perfil. La selección **no** crea
rating automático ("esto me representa" ≠ "5 estrellas") **ni** entrada de diario (el
onboarding construye identidad, no registra consumo).

### Diseño de Fase 1 (OQ1–OQ5, resueltas)

| OQ | Decisión Fase 1 |
|---|---|
| **OQ1 — Álbumes favoritos** | Tope fijo de **6**, rejilla 3×2, orden manual, reemplazo libre, selección 100 % editorial (sin orden automático por rating/escuchas; no requiere reseña previa). Ver D10. |
| **OQ2 — "En rotación"** | Solo diario + **recencia + frecuencia** con decaimiento, ventana **30 días**, cálculo bajo demanda. Canciones = señal primaria, álbumes = agrupación contextual. Nunca desde reacciones/favoritos/ratings. Ver D10. |
| **OQ3 — Ruta descubrimiento** | **`/[locale]/explore`** como contenedor conceptual; Fase 1 abre en experiencia de álbumes. Ver D7. |
| **OQ4 — `review`** | **Tabla propia `reviews`** (no `comment` + discriminador); infra de UI/moderación/reacciones compartible, dominio independiente. Ver D4. |
| **OQ5 — Pico de rotación** | Canción **≥3 registros / 7 días**, álbum **≥2 registros / 7 días** → una fila-síntesis "En rotación" en el feed, tono cultural, no gamificado. Mismo concepto que el perfil a 7 días vs 30. Ver D9. |

### Implementación de Fase 1 (IQ1–IQ5, resueltas)

| IQ | Decisión Fase 1 |
|---|---|
| **IQ1 — Álbum en rotación** | Heurística **experimental** (no definición de producto): ≥3 canciones distintas del álbum en 30 d *o* ≥2 registros explícitos del álbum en 30 d. Registro explícito del álbum pesa más. Repetir una canción no eleva el álbum. Modelar como `señales → score → estado`, no umbral hard-codeado. Ver D10. |
| **IQ2 — Decaimiento** | Ventana **30 días con pesos discretos por recencia** (0–7 / 8–21 / 22–30). Sin half-life ni curva exponencial en Fase 1. Guardar eventos crudos (`timestamp + entidad + tipo`) para poder cambiar el scoring después sin migrar. Ver D10. |
| **IQ3 — Target de `reviews`** | Condicionado al roadmap: si reseñas de canción/artista están cerca → `target_type`+`target_id` con whitelist (`album` en Fase 1); si no → `album_id` obligatorio, sin polimorfismo prematuro. Decide la facilidad técnica del stack, no UX. Ver D4. |
| **IQ4 — Convergencia de la red** | **≥3 personas distintas de la red + misma obra + 7 días**; interacción = diario/rating/reseña/favorito; el feed muestra una síntesis social única. Ver D9. |
| **IQ5 — Onboarding → favoritos** | Los álbumes del onboarding se guardan **directamente** como Álbumes favoritos. Sin rating ni entrada de diario automáticos. Ver "Onboarding de dos puertas". |

### Modelo de cuatro capas y separaciones que no deben colapsar

La arquitectura resultante son **cuatro capas** que el producto conecta pero **no
confunde**:

```
  IDENTIDAD  →  álbumes favoritos · artistas seguidos · himno
  OBRA       →  álbum · canción · artista · rating · reseña
  CONSUMO    →  entradas de diario · actividad temporal · "en rotación"
  SOCIAL     →  feed · convergencia · comentarios · descubrimiento
```

Seis separaciones que deben sostenerse **en el modelo de datos y en la UI**:

| # | Separación | Consecuencia |
|---|---|---|
| 1 | Identidad ≠ consumo | elegir un álbum favorito no es una escucha |
| 2 | Consumo ≠ opinión | registrar una escucha no toca el rating |
| 3 | Opinión ≠ conversación | una `review` no es un `comment` |
| 4 | Popularidad ≠ convergencia | que algo sea popular no significa que tu red lo escuche |
| 5 | Recencia ≠ frecuencia | una escucha reciente no es, por sí sola, "en rotación" |
| 6 | Álbum ≠ canción | varias canciones de un álbum → relación con la obra; una canción repetida → no |

### Principio común de todas estas decisiones

**No convertir cada señal de usuario en una interacción social nueva.** La UI debe
*revelar* estas seis relaciones distintas en vez de tratarlas como equivalentes:

| Señal | Frase | Superficie |
|---|---|---|
| Preferencia | "me gusta" | favorito, reacción |
| Identidad | "esto me representa" | álbumes favoritos, destacados, himno |
| Consumo | "estoy escuchando esto" | diario, "en rotación" |
| Crítica | "tengo algo que decir sobre esta obra" | reseña de álbum, rating |
| Actividad | "esto es lo que hice" | rastro reciente, feed |
| Pico | "esto se volvió temporalmente un patrón" | fila-síntesis "en rotación" (7 días) |

## Diferido a Fase 2+ (no bloquea Fase 1)

- Curva de decaimiento sofisticada de "en rotación" (half-life / exponencial), si los
  datos la justifican.
- Tercera escala temporal de rotación: hábitos a ~1 año.
- Ponderación por tipo de interacción en la convergencia de la red (reseña > registro).
- Notificaciones de lanzamiento para "seguir artista" (D8).
- Importación de escuchas desde servicios de streaming (Q3b).
- Reseñas de canción/artista como superficie prominente (el esquema puede dejarlas
  preparadas según IQ3).
