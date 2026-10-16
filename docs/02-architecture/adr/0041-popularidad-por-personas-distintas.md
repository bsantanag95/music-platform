# ADR 0041 — Popularidad por personas distintas, con ventana que se agranda

## Estado

Aceptado (cambio `explore-popular-now`, 2026-10). Reemplaza el riel "Más reseñados" de `/explore` y el criterio del orden
"Populares" de los listados (conteo de valoraciones). Complementa el [ADR 0035](0035-colecciones-del-dia-0.md) (la señal de
calidad, que mide otra cosa: qué es bueno, no qué se está escuchando).

## Contexto

"Más reseñados" contaba solo reseñas, la señal más escasa de la plataforma (19 reseñas frente a 120 escuchas, 116 ítems en
listas y 86 valoraciones en la base de scratch). Quien escucha, valora o guarda un disco no contaba para nada, y la sección solo
hablaba de álbumes. El orden "Populares" de los listados contaba valoraciones, con el mismo sesgo. Hacía falta una definición
única de "popular" que funcionara el primer día con poca gente y creciera sola.

## Decisión

1. **Se cuentan personas, no acciones.** Por cada objetivo (álbum, artista o canción), cada persona aporta la suma de los pesos
   de los **tipos** de gesto distintos que hizo sobre él, con un tope de 4. La puntuación es la suma sobre las personas. Pesos:
   favorito 3; reseña 2; seguir al artista 2; escucha del diario, valoración, lista y colección 1; pendiente y "en búsqueda" 0,5.
   Las estrellas cuentan como gesto, no por su nota: popular no es bien valorado. Desempate: personas, actividad más reciente, id.
2. **Artistas por sus discos.** Un artista suma sus gestos directos y los de sus discos, atribuidos al primer artista acreditado;
   el tope por persona se aplica al artista en conjunto.
3. **Privacidad.** Solo cuentas activas; nada marcado como privado (escuchas, favoritos, colección, "en búsqueda", listas) ni
   reseñas ocultas. La cifra "N personas" se muestra solo desde 5. Nunca se expone quién.
4. **Ventana que se agranda sola.** "Popular ahora" usa 30 días; si no llega al mínimo del tipo (6 álbumes, 5 artistas, 5
   canciones) con 2 personas, prueba 90 días y luego desde siempre con 1 persona, y dice cuál usó. Cada tipo elige su escalón.
5. **Sin tabla materializada.** Las tablas de gestos crecen con la actividad, no con el catálogo: una unión con agregación en dos
   niveles cuesta milisegundos hoy. La sección se cachea 15 minutos en memoria (`ttl-cache.ts`). El orden "Populares" de los
   listados lee el ranking de siempre (ids ordenados, misma caché) y ordena por su posición.
6. **Una sola definición para tres usos:** la sección "Popular ahora" (pestañas Álbumes, Artistas y Canciones), el orden
   "Populares" de los listados y la colección automática "Lo más popular del mes" (`popular-month`), que reemplaza a "Lo más
   reseñado del mes".

## Consecuencias

- La sección muestra algo desde el primer día y lo dice honestamente ("de siempre" cuando no hay actividad reciente).
- Los pesos son una decisión de producto: viven en `POPULARITY_WEIGHTS` y en `business-rules.md`, y cambiarlos no toca consultas.
- Si la actividad crece hasta que la consulta cueste, la puntuación se puede materializar con el mismo contrato (otro ADR).
- Valoraciones, pendientes y "en búsqueda" no tienen audiencia propia y cuentan como cifra anónima, igual que en "Mejor valorados".
