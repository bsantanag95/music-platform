## 1. Marcas

- [ ] 1.1 `getDiscographyMarks`: sumar favoritos, Pendiente, puntaje detallado y pertenencias a listas propias en consultas por lote (design.md D3)
- [ ] 1.2 Tipos `DiscographyMarks` / `DiscographyMarksProps` y su paso desde la pestaña Discografía
- [ ] 1.3 Tests del servicio con mocks de DB

## 2. Popover de acciones

- [ ] 2.1 Componente del botón "…" y el popover: diálogo no modal, nombre accesible, foco al abrir, Escape y clic afuera, un solo abierto, hoja inferior en móvil (design.md D1)
- [ ] 2.2 Acciones: registrar escucha con "Agregar detalles" (`ListenEntryForm`), Favorito, Pendiente, listas (`AlbumListPicker`), calificar (`StarRatingInput`, puntaje detallado solo si sigue coherente), ir al álbum; errores y estados en vuelo (design.md D2)
- [ ] 2.3 Variante sin sesión (design.md D2)
- [ ] 2.4 Estado de marcas en `ArtistDiscography`, actualizado por el popover

## 3. Grilla y tabla

- [ ] 3.1 Grilla: botón "…" en la esquina de la carátula (hover, foco, siempre en táctiles) y franja de marcas con íconos del panel (design.md D4)
- [ ] 3.2 Tabla: columna "Tú" con las mismas marcas, columna "Media" con "—", tipo junto al título solo si no es álbum, sin columna Tipo, botón "…" al final; segunda línea en móvil (design.md D5)
- [ ] 3.3 Mensajes en es (voseo) y en; retirar `fewRatings` y la columna de tipo si quedan sin uso

## 4. Tests

- [ ] 4.1 Popover: abrir, un solo abierto, foco y Escape, cada acción y su marca, fallo, sin sesión
- [ ] 4.2 Grilla y tabla: franja de marcas, "—" en Media, etiqueta de tipo solo en no-álbumes

## 5. Documentación y cierre

- [ ] 5.1 `docs/05-features/catalog-browsing.md`
- [ ] 5.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [ ] 5.3 Verificar en el navegador contra la BD de scratch, escritorio y móvil, con y sin sesión
