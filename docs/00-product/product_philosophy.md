# Filosofía de Producto — music-platform

**Estado:** 🟢 Pilares principales resueltos (fuente: discusión conceptual 2026-08-19 y 2026-08-20)
**Propósito:** Documentar la tesis central del producto antes de que se diluya en decisiones de implementación. Este documento no origina decisiones arquitectónicas (eso sigue siendo trabajo de las ADRs), pero es la fuente de la que deberían derivarse futuras ADRs de UX/producto.
**Ubicación sugerida:** `docs/01-product/philosophy.md` (o el número que corresponda según la numeración existente en `/docs` — ajustar al integrar).

---

## 1. El problema que motivó este documento

A diferencia de Letterboxd (cine) o Backloggd (videojuegos), la música no tiene ejes de evaluación que se sientan "objetivos" (guion, actuación, gameplay). El rating musical parece degradar directamente en tribalismo de género: alguien puntúa alto lo que ya le gusta y bajo lo que no, sin mediar criterio.

Pregunta original: **¿qué valor aporta un sistema de rating si es puro reflejo del gusto pre-existente?**

## 2. Tesis central: la subjetividad no es un bug, es el producto

El error de partida es modelar el rating como *medición de calidad objetiva agregada* (modelo Metacritic: "¿qué tan buena es esta obra, en el vacío?"). Ese modelo tampoco es realmente cierto en cine — un fan del terror puntúa terror más alto que el promedio — pero ahí es menos visible porque el consenso crítico da una ilusión de objetividad.

El modelo que sí sostiene comunidades activas durante años es otro: **el rating como expresión de identidad + comparación social**, no como veredicto de calidad. Bajo este modelo:

- Que un oyente de rock puntúe mal el reggaetón no es ruido que contamina el dato — **es el dato**. Es información sobre quién es esa persona.
- Nadie entra a estos sitios buscando "la verdad" sobre una obra. Entra a ver qué le pareció a alguien cuyo criterio le importa, o a dejar constancia pública del propio criterio.
- El tribalismo de género en música es *más* fuerte que en cine porque la música está más ligada a identidad social. Esto es una ventaja de retención si el producto no vende el puntaje como "score de calidad universal", sino como "mi opinión, mi historial, mi perfil".

**Precedente empírico:** RateYourMusic lleva +20 años operando bajo este modelo (comunidad de nicho, alta fricción, sin pretensión de objetividad) y sigue siendo referencia de formación de gusto en escenas indie/underground. Album of the Year es una variante más accesible de lo mismo. La pregunta "¿puede funcionar un sitio de rating musical subjetivo?" ya tiene respuesta empírica: sí.

## 3. Por qué Spotify no es competencia real

Spotify ya resuelve: listas, compartir, sugerencias por algoritmo. No tiene sentido competir ahí. Pero hay una capa que Spotify **estructuralmente no puede construir**, porque contradice su propio modelo de negocio (maximizar tiempo de escucha, mantener todo "agradable", que el algoritmo sea la autoridad, nunca mostrar que algo es peor que otra cosa):

- Un score de calidad negativo/crítico va contra el incentivo de un servicio de streaming.
- Spotify no puede darle a un usuario "reputación de buen criterio" frente a otros — ahí el consumo es privado y homogéneo.
- Spotify no tiene incentivo en dejar que la gente termine de "completar" algo (discografías, décadas, géneros) — su modelo es consumo infinito, no completismo.

La distinción del producto no es "hacemos lo mismo que Spotify pero con comentarios". Es que el producto vive en una capa (identidad + criterio + comunidad) que Spotify no puede ni quiere ocupar.

## 4. Pilares de diferenciación

Estos son los ejes concretos que dan valor más allá de rating/comentarios genéricos:

| Pilar | Qué resuelve | Referencia |
|---|---|---|
| **Grafo social independiente del origen del audio** | Centraliza historial y red de gusto sin importar si el usuario usa Spotify, vinilo, Bandcamp o YouTube Music | — |
| **Rankings y listas curadas por personas** | Contenido navegable sin necesidad de estar escuchando en ese momento (ej. "mejores discos de shoegaze de los 90 según usuarios") | Letterboxd lists |
| **Reseñas como contenido en sí mismo** | Género de escritura propio; gente entra a leer/comentar reseñas sin consumir la obra en ese momento | Letterboxd reviews |
| **Recorrido personal por discografía (opcional)** | Herramienta de organización y descubrimiento propio — el usuario elige qué escuchar de un artista, a su ritmo, y puede compartirlo si quiere. No es checklist obligatoria ni comparación social | — |
| **Capital social del gusto** | Reputación de "buen criterio" o "descubridor temprano" — imposible en un servicio de consumo privado | — |
| **Rituales anuales con opinión, no solo estadística** | Spotify *muestra* tu año (Wrapped); acá el usuario *construye* y *comenta* su año | — |

## 5. Principios de diseño derivados

Estos principios deberían guiar decisiones de UX concretas más adelante (y candidatos a formalizarse como ADRs cuando se implementen):

1. **Presencia ≠ Criterio** (ya establecido en el proyecto). Loggear que escuchaste algo debe tener fricción cero y no exigir juicio. El criterio (rating/comentario) es una capa opcional y deliberada encima. Esto es coherente con el modelo identidad+social: no todo consumo necesita opinión pública.
2. **No presentar el agregado como "verdad objetiva".** Si existe un promedio o score global, su framing debe ser descriptivo ("así lo puntuó esta comunidad"), nunca prescriptivo ("esto es objetivamente bueno"). Evitar lenguaje tipo Metacritic.
3. **El desacuerdo es contenido, no ruido.** Diseñar para que sea visible y valioso cuando el rating de un usuario se aleja del promedio o del de sus amigos — eso es justamente la señal identitaria.
4. **Optimizar por afinidad de gusto, no por popularidad genérica.** El follow/red social debería poder basarse en "gente cuyo criterio se parece al mío", no solo en follows arbitrarios.
5. **Priorizar profundidad de catálogo por sobre polish de descubrimiento algorítmico.** No competir con el algoritmo de Spotify; competir en completismo, historial y curaduría humana.

## 6. Decisiones de UX resueltas (2026-08-20)

### 6.1 Trust network — modelo híbrido (confirmado)

El grafo social visible (follow, feed) se mantiene **explícito**. La afinidad de gusto calculada (similaridad de ratings entre usuarios) aparece únicamente como mecanismo de **descubrimiento** ("gente con gusto parecido al tuyo"), no reemplaza el follow ni define el feed.

No bloquea Phase 4/5: el esquema de `rating` ya es por usuario/ítem, por lo que el cálculo de afinidad se puede construir después sin migración. El algoritmo de afinidad en sí queda pendiente de diseño para cuando haya densidad de datos suficiente.

### 6.2 Puntuación individual vs. agregada — pilar fundamental

Estructura confirmada para la vista de un ítem: **[Puntuación Global — Cantidad de personas que puntuaron — Histograma]**, los tres visibles simultáneamente.

Se descarta la opción de mostrar solo ratings de la red de seguidos: el espacio de ítems en música es demasiado amplio (canciones, álbumes, EPs, singles, versiones, remasters, colaboraciones) y para la mayoría de los ítems concretos nadie de la red propia habrá puntuado todavía — una UI así se sentiría vacía la mayor parte del tiempo.

El promedio global **no se descarta pese a la tensión con el principio 5.2** ("no presentar el agregado como verdad objetiva") — al contrario, se identifica como generador de debate ("¿cómo este álbum tiene solo 7.2?"), coherente con el principio 5.3 ("el desacuerdo es contenido"). El framing sigue siendo descriptivo, no prescriptivo, pero el número se muestra.

**Riesgo identificado:** un promedio simple es vulnerable a review bombing (brigading coordinado, bots, picos de votos anómalos). El cálculo robusto (ponderación por antigüedad/actividad de cuenta, detección de anomalías, etc.) queda **fuera de alcance de este documento** — amerita su propio documento técnico/ADR cuando se aborde. No bloquea el diseño de UI actual: puede construirse sobre un promedio simple inicialmente y migrar el cálculo por debajo sin cambiar el contrato de UI.

### 6.3 Rankings/listas comunitarias — confirmado con excepción editorial

Confirmado: el contenido navegable nace de listas creadas por usuarios, no de agregación algorítmica en esta fase.

**Excepción:** la plataforma (curaduría humana del equipo, nunca IA ni proceso automático) puede publicar sus propias listas editoriales para la comunidad. Esto introduce dos necesidades de diseño pendientes:
- Distinguir visualmente una lista "oficial/editorial" de una lista de usuario común.
- Definir qué rol/cuenta tiene permiso para publicar como "la plataforma" (a resolver como ADR de permisos/roles cuando se diseñe ese sistema).

### 6.4 Recorrido de artista (ex "completismo de discografía") — reformulado, sin curaduría editorial

Renombrado a propósito: dejó de ser "completismo" (con la connotación de meta que se puede cumplir o no) y pasó a ser una herramienta de organización personal, opcional por artista, sin comparación social ni progreso "correcto".

Flujo confirmado:
- Es opt-in por artista. No todos los artistas que un usuario sigue o escucha necesitan tener un recorrido armado — el usuario decide para cuáles artistas quiere "organizar su escucha de fondo".
- Al activarlo, la UI muestra **todos los álbumes agrupados por tipo**, usando la clasificación que ya provee MusicBrainz vía `release-group` (`primary-type`/`secondary-type`): Estudio como grupo principal, más En Vivo, EP, Compilación, etc.
- **Default de selección:** los álbumes de tipo Estudio vienen pre-marcados (menor fricción — es más simple deseleccionar lo que no interesa que ir seleccionando uno por uno). El resto de los grupos (En Vivo, EP, Compilación, etc.) quedan desmarcados por default.
- El usuario puede editar la selección libremente en cualquier momento, en cualquier dirección — sacar discos de estudio que no le interesan, agregar discos en vivo/EPs/compilados después, revertir decisiones previas. Sin restricciones.
- **Se descarta la curaduría editorial de "discos esenciales fuera de estudio"** (ej. *Made in Japan*, *Alive*) como excepción marcada por default. Sería valioso, pero el costo de mantenimiento (evaluación artista por artista, sin escalar con el catálogo) no se justifica frente al beneficio, especialmente dado que no hay comparación social que dependa de una vara compartida. Estos discos simplemente aparecen dentro de su grupo de tipo (En Vivo) como cualquier otro, sin tratamiento especial.
- Sin comparación social ni "estado correcto" de progreso — es organización personal, compartible si el usuario quiere, no una competencia ni un logro medido contra otros usuarios.

**Modelo de datos:** se resuelve reutilizando el mecanismo de listas ya definido en 6.3 (mismo tipo de entidad), con un subtipo especializado "recorrido de artista" que se pre-puebla automáticamente desde metadata de MusicBrainz al crearse. No requiere entidad nueva separada de listas/`Favorito`/`listen_entry`, ni ningún proceso editorial — a diferencia de 6.3, este subtipo es 100% self-service, sin intervención humana del equipo.

### 6.5 Perfil público — confirmado, modelo Letterboxd

Confirmado sin cambios: resumen/stats de identidad arriba (favoritos, discografías avanzadas, capital social del gusto), actividad reciente abajo. Sin alternativas descartadas que valga la pena registrar aquí.

## 7. Preguntas abiertas remanentes

- [ ] Diseño del algoritmo de afinidad de gusto para descubrimiento (6.1) — depende de densidad de datos, no urgente.
- [ ] Cálculo robusto de puntuación global anti review-bombing (6.2) — amerita documento/ADR técnico propio.
- [ ] Rol/permisos para cuentas que publican contenido "oficial de la plataforma" (6.3) — exclusivo de listas editoriales; 6.4 ya no depende de este sistema.

## 8. Relación con la metodología del proyecto

Este documento es **de producto/visión**, no de arquitectura técnica. No reemplaza ni origina ADRs. Cuando alguna de las preguntas abiertas se resuelva en una decisión concreta con impacto en datos/API/UI, esa decisión debe documentarse como ADR de la forma habitual, citando este documento como justificación de producto — igual que las OpenSpec references a `/docs`, nunca al revés.

---

*Documento vivo. Actualizar a medida que se resuelvan las preguntas abiertas de la sección 7.*
