---
target: Feed de actividad (Tu feed / Tu rastro reciente)
total_score: 16
max_score: 28
na_heuristics: 3,5,10
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\besan\\Documents\\Proyectos\\music-platform\\src\\components\\feed\\FeedActivityList.tsx"
target_fingerprint: "sha256:ee331b7398d03c2d909777c7ac68ea72c4aab1116685eca4c097eba711bf9423"
target_path: "C:\\Users\\besan\\Documents\\Proyectos\\music-platform\\src\\components\\feed\\FeedActivityList.tsx"
timestamp: 2026-09-04T00-20-49Z
slug: src-components-feed-feedactivitylist-tsx
closed: true
---
# Auditoría visual y de experiencia — Feed de actividad

Method: dual-agent (A: revisión de diseño · B: detector + evidencia mecánica, sub-agentes aislados y paralelos)

Alcance: código fuente de FeedActivityList.tsx y sus tres montajes (/me/feed, y en Inicio con sesión "Tu feed" y "Tu rastro reciente"), tokens de globals.css, DESIGN.md/PRODUCT.md, cadenas de messages/es/*. Inspección en navegador NO posible (/es/me/feed 307 a login sin credenciales; /es sirve Inicio anónimo que no monta este componente).

## Design Health Score

Superficie Operate, solo lectura.

| # | Heurística | Score | Problema clave |
|---|-----------|-------|----------------|
| 1 | Visibilidad del estado | 2 | Sin marca de "nuevo desde tu última visita", sin no-leído, sin memoria de posición. loading/loadError ok. |
| 2 | Correspondencia mundo real | 3 | Verbos ES naturales. "Valoró con 4.5 estrellas" torpe y sin estrellas. |
| 3 | Control y libertad | n/a | Solo lectura. |
| 4 | Consistencia y estándares | 2 | max-w-2xl (feed) vs max-w-3xl (Inicio). LightRow títulos en font-data (mono) vs HeavyRow font-display — regla tipográfica rota para 4/5 tipos. Fechas relativas acá, absolutas en bloques compactos de Inicio. |
| 5 | Prevención de errores | n/a | Sin acciones destructivas ni de entrada. |
| 6 | Reconocer vs recordar | 2 | Tipo de actividad solo por verbo mono chico apagado; sin iconografía por tipo. Fechas solo relativas. Rating sin glifos. |
| 7 | Flexibilidad y eficiencia | 1 | Sin filtro por persona/tipo, sin salto a lo nuevo, sin agrupación, sin control de densidad, sin atajos. |
| 8 | Estética y minimalismo | 3 | Genuinamente contenido; pero minimalismo tipeó a "sub-comunica". |
| 9 | Recuperación de errores | 3 | loadError con role=alert, lenguaje llano, botón disponible. Sin reintento diferenciado. |
| 10 | Ayuda y documentación | n/a | Superficie autoevidente; empty state enseña. |
| Total | | 16/28 (57%) | Aceptable — al borde de "Pobre". |

Las tres notas más bajas son el mismo problema: cada fila comunica demasiado poco.

## Veredicto de especificidad

Una app social genérica podría shippear este componente sin cambios cambiando solo strings. Lo autoral vive en globals.css y el copy, no en el componente. LightRow (usuario, verbo, target, reacción en una línea con interpuntos) = líneas de Mastodon/Twitter/GitHub. RelativeDate mono top-right = cualquier feed desde 2010. Set de reacciones genérico. "Cargar más" + append a useState = paginación por defecto. El modelo pesada/liviana es reflexivo; su render no. El vocabulario de producto (Primera escucha, Repetición, Redescubrimiento) se renderiza en el mismo mono apagado de 12px que todo, entonces es invisible. El feed no parece que se trate de música.

Detector Impeccable: LIMPIO — exit 0, cero hallazgos sobre 5 archivos. El diseño no viola ninguna regla mecánica; está sub-expresado, y eso ningún detector lo atrapa.

Evidencia mecánica (B):
- Fila liviana = 100% font-data (mono), 100% text-xs. Autor/verbo/título/reacción al mismo tamaño; única distinción text-paper vs text-paper-muted.
- El acento ámbar no existe en reposo. Las 3 apariciones de text-amber son todas hover:text-amber sobre enlaces.
- El disco de vinilo nunca aparece. HeavyRow chequea cover antes de montar CoverThumb, entonces una entrada pesada sin portada renderiza NINGÚN thumbnail, ni placeholder. DiscPlaceholder inalcanzable.
- Rating descartado: ratingLabel = "Valoró con {stars} estrellas", sin score 1-100, sin glifos. Rating sin elemento visual.
- "Tu feed" y "Tu rastro reciente" idénticos: misma section, misma h2, mismo renderer. RecentSelfActivity pasa por FeedActivityList, entonces AuthorLink imprime tu propio nombre en cada fila.
- Único ícono en el feed: reacciones, solo en escuchas con reacción.

Overlays visuales: no disponibles (no se pudo inyectar en superficies autenticadas).

## Impresión general

El modelo es correcto y el detalle está sub-construido. El split pesada/liviana codifica bien el Principio 1. Pero el contraste está expresado casi solo con padding (py-5 vs py-3, 8px) y "título mono chico" vs "título display + párrafo serif". Entre filas livianas — la mayoría — no hay jerarquía. El pico emocional real es la nota escrita de un amigo en Source Serif; todo lo demás se siente como un log. El feed no se siente social ni musical.

## Lo que funciona

1. La clasificación por peso de contenido es el modelo correcto. isFeedEntryWithText() corta en "hay prosa", mapea al Principio 1. Función pura, chica, testeable. Falla la fuerza del contraste, no el modelo.
2. Contención real / Regla de Rareza. Sin sombras/gradientes/motion, y sin botones de like/responder pegados al feed. Solo-lectura es decisión de producto correcta y el componente la honra.
3. Base de accesibilidad cuidada. ul/li semánticos, time con dateTime y title, íconos nunca única señal, DiscPlaceholder decorativo fuera del árbol a11y, foco ámbar 2px, contraste ~7:1, role=alert. Empty state enseña el modelo de seguir.

## Issues priorizados

### [P0] La música no es lo más fuerte en pantalla
Qué: LightRow (4/5 tipos, siempre) pone el título en font-data text-xs, mismo tamaño que autor y verbo, distinguido solo por opacidad. El nombre de un disco en la tipografía reservada para datos.
Por qué: Es "un Letterboxd para música". Sin escanear títulos como lomos, el feed falla su propósito. Viola la regla tipográfica del propio DESIGN.md.
Fix: Promover todo título a font-display, tamaño consistente (text-base+), columna izquierda única, ambos pesos. Degradar autor/verbo/audiencia a línea de metadato mono arriba. El título es la fila.
Comando: /impeccable typeset

### [P0] El objeto-firma (disco) nunca aparece; no hay riel izquierdo
Qué: albumCover() devuelve arte solo para release-group; artista/canción/lista colapsan a texto puro. redesign-feed quitó DiscPlaceholder deliberadamente. El objeto más reconocible ausente de la superficie social más visitada; sin borde izquierdo fijo.
Por qué: Escaneabilidad necesita columna izquierda consistente. Identidad necesita el disco. Independencia del artwork es lo que el disco fue diseñado para resolver.
Fix: Celda izquierda rígida ~40-48px por fila: portada si hay, disco si no, tipo de actividad como marca mono. Grilla disciplinada, no decoración flotante. TENSIÓN: sube alto de filas livianas + agrega columna; choca con "no depender de portadas" y densidad.
Comando: /impeccable layout

### [P1] "Tu feed" y "Tu rastro reciente" visualmente idénticos; tu rastro repite tu nombre
Qué: Ambos section max-w-3xl + h2 font-display text-xl + link arriba-derecha + FeedActivityList. RecentSelfActivity pasa por el mismo renderer, entonces AuthorLink imprime tu nombre en cada fila.
Por qué: El punto 8 lo pide. "De quién es" es la pregunta primaria; contestarla redundantemente en tu propio recap es ruido.
Fix: RecentSelfActivity tira la columna de autor, se reformula como recap en primera persona/temporal ("Esta semana registraste"), frame distinto. "Tu feed" mantiene la persona como ancla, promovida.
Comando: /impeccable layout

### [P1] El rating dual se renderiza como sentencia sin sabor
Qué: actionLabel a "Valoró con 4.5 estrellas". detailedScore (1-100) descartado. Sin glifos de estrella.
Por qué: "La subjetividad es el producto, el mecanismo que un vecino no puede copiar." El feed es donde ocurre la comparación social de ratings. Renderizarlo como texto descarta el diferenciador y desperdicia el único lugar para ámbar en reposo.
Fix: Fila de estrellas a medio paso en ámbar + score en mono cuando existe. Minoría de filas, entra en Regla de Rareza.
Comando: /impeccable colorize

### [P2] En reposo cero ámbar y ninguna señal de clickeable
Qué: Todo accent es hover:text-amber. En touch/reposo la pantalla entera es paper/paper-muted sobre ink. Enlaces en text-paper; nada señala "tocá acá".
Por qué: La navegación es la única interacción, y su descubribilidad depende de un hover que móvil nunca ve. "La única luz de la sala" apagada.
Fix: Un solo trabajo semántico para ámbar en reposo (estrellas del rating, o reacción obsesión/me encantó). Afordancia persistente en títulos (subrayado sutil).
Comando: /impeccable colorize

### [P3] Sin chunking: N escuchas peladas de una persona = N líneas casi idénticas
Qué: Sin agrupación por autor/día; fecha relativa por fila. redesign-feed difirió esto.
Por qué: Puntos 3/9 y Principio 1 — la presencia pelada debería sentirse ambiente.
Fix: Colapsar entradas consecutivas de sola presencia del mismo autor. Un subhead de fecha por día.
Comando: /impeccable distill

## Qué debería transmitir + principios

Qué transmitir: Abrir el feed debería sentirse como entrar a una sala donde gente que vos elegiste está escuchando — tranquila, presente, inequívocamente sobre música. Los nombres de álbumes/artistas/canciones son los lomos en el estante: la capa que escaneás primero. Una escucha pelada = compañía ambiente; una impresión escrita = te frena como alguien que habla. Tu rastro es esa sala en un espejo — recap calmo, nunca scoreboard, nunca algo que "seguís".

Principios:
1. El título es la fila. Objetivo en Space Grotesk display, tamaño consistente, columna izquierda única, ambos pesos. autor/verbo/audiencia a línea de metadato mono.
2. Un riel izquierdo disciplinado lo hace musical y escaneable. Celda ~44px: portada o disco de círculos concéntricos + marca del tipo de actividad.
3. El peso es espacial, no solo padding. Liviana = una línea baseline, ambiente. Pesada = la fila se abre sobre panel ink-surface con la prosa en Source Serif como centro. Profundidad por temperatura (No-Shadow).
4. El ámbar significa una cosa, máx una vez por fila. Un solo trabajo en reposo (estrellas o reacción obsesión/me encantó). Todo lo demás paper/paper-muted.
5. Los ratings se renderizan como ratings. Estrellas a medio paso en ámbar + score 1-100 en mono.
6. Tu rastro es otra sala. RecentSelfActivity tira el autor, recap en primera persona/temporal, frame distinto. FeedPreview mantiene la persona.
7. (estirado) La presencia ambiente colapsa. Escuchas/favoritos consecutivos de un autor se pliegan; subhead de fecha por día.

Brecha de datos: el payload del feed (FeedTargetInfo, ListenTargetInfo) trae solo title — sin campo de artista. "Kind of Blue" sin "Miles Davis" obstaculiza que el feed se sienta musical. Este rediseño probablemente necesita agregar artistName al payload (query de listFeed + schema), a diferencia del redesign-feed anterior.

## Persona red flags

Oyente-que-vuelve (150+ follows, diario): sin "nuevo desde tu última visita"; sin filtro por persona/tipo; 8 repeticiones de un amigo empujan todo abajo sin colapso; useState + offset construye DOM grande, scroll perdido al volver.
Primerizo (siguió a 3): dos secciones de Inicio idénticas sin explicación, nombre propio en cada fila del rastro parece bug; "Redescubrimiento" indefinido en la mono más tenue; objetivos de canción/artista sin arte ni disco, no parece música.
Móvil distraído: significado de LightRow en una línea de 12px mono; tap targets inline ~12px separados por interpunto muy juntos; ámbar solo hover = cero feedback táctil; fechas solo relativas sin ancla.
A11y (secundario, bien resuelto): LightRow es un p con dos Link y nodos interpunto literales, entonces el lector de pantalla anuncia una corrida indiferenciada; verbo no ligado programáticamente; sin heading/landmark por ítem. Foco y contraste sí bien.

## Observaciones menores

- Dos sistemas de fecha en la misma página: FeedActivityList relativa, bloques compactos de Inicio absoluta (formatFeedDate).
- Dos tratamientos de enlace de autor: feed text-paper, FeedEntryBody text-paper-muted.
- "Valoró con 1 estrellas" (bug de plural menor).
- handleLoadMore sin afordancia de reintento distinta del loadError genérico.
- Si el dev server corre desde main, /me/feed muestra el viejo FeedEntryCard; FeedActivityList vive sin commitear en feature/redesign-feed.

## Preguntas para pensar

1. Si Cover Art Archive no devolviera nada mañana, que seguiría diciendo "música" y no "libros"/"películas". Hoy: solo la palabra escucha.
2. El feed se lee de arriba a abajo o se escanea. La LightRow corrida está hecha para leer; su contenido para escanear.
3. Una escucha pelada debería ser una fila, o una marca.
4. Por qué tu recap usa el componente del feed. "Tu rastro reciente" es un feed o son tres líneas de tu diario.
5. Para qué es el ámbar en una app cuya pantalla más ocupada no tiene nada de él.
6. La escala de reacción (me gustó, me encantó, obsesión) es el dato más emocional que tenés. Podría "obsesión" ser el pico del feed, grande y ámbar, una vez.
7. Fechas relativas en cada fila: "cuándo" es siquiera el segundo dato más importante.
