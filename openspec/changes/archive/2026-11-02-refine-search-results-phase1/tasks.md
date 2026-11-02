## 1. Relevancia

- [x] 1.1 `known` en `RankKey`; `exploredScores` y `exploredArtistMbids`
- [x] 1.2 Álbumes y canciones usan la señal; la coincidencia local desempata con ella antes del tope

## 2. Estados

- [x] 2.1 `suggestSpelling` (trigramas del catálogo)
- [x] 2.2 `SearchEmpty`: título por tipo, sugerencia, consejos, búsqueda avanzada; "Quitar filtros" con filtro
- [x] 2.3 Sin pastillas con lista vacía y sin filtro
- [x] 2.6 "¿Quisiste decir…?" también sobre una lista débil (`DidYouMean`, `coverageLevel` = 4)
- [x] 2.4 Error propio de MusicBrainz y aviso de lista parcial
- [x] 2.5 Título de la pestaña y esqueleto al ancho de la página

## 3. Cierre

- [x] 3.1 Mensajes es/en (sin `results.emptyDescription`) y `i18n:client-messages`
- [x] 3.2 Tests
- [x] 3.3 Docs: `05-features/catalog-browsing.md`
- [x] 3.4 Verificación en build de producción (:3100)
