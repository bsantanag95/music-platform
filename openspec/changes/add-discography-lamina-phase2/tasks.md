## 1. Modelo

- [x] 1.1 `drizzle/0085_discography_preference.sql`, aplicada en scratch; `schema.ts`, `sql-model.md`, `domain-model.md`; exportación de datos
- [x] 1.2 `discography.ts`: secciones elegidas, pistas de la edición representativa y notas de canciones en lote; D9; pruebas
- [x] 1.3 Lámina de álbum: lectura de un disco de la discografía, umbral de 3 canciones; pruebas
- [x] 1.4 `PUT /api/me/discography/<artistId>` con validación; pruebas; `contracts.md`

## 2. Imágenes

- [x] 2.1 Grilla Por canción en Publicación, Enlace e Historia, con "+n" y celdas vacías; muestras
- [x] 2.2 Lámina de álbum en barras; muestras
- [x] 2.3 Objetivo: vista del dueño con respaldo a Por disco, referencia de álbum, mismo tope de carátulas; pruebas

## 3. Páginas

- [x] 3.1 Selector de vista para todos y ajustes del dueño (secciones y vista por defecto); pruebas
- [x] 3.2 Grilla Por canción en la página, accesible como tabla; pruebas
- [x] 3.3 `?disco=` con las barras, enlaces desde cada columna y su Compartir; pruebas

## 4. Documentación y textos

- [x] 4.1 `docs/05-features/sharing.md` (D9 y estado) y `docs/01-domain/business-rules.md`
- [x] 4.2 Textos es/en y `client-messages`
- [x] 4.3 Ampliar `scripts/smoke-test-discography-lamina.ts` y su entrada en `AGENTS.md`

## 5. Verificación

- [x] 5.1 Smoke contra Postgres real: preferencias, discos con solo notas de canciones, D9, Lámina de álbum por visitante, `CHECK` de `0085` y lectura bajo 150 ms con 50 discos de 15 pistas
- [x] 5.2 Muestras PNG de la grilla con 3, 12 y 25 discos y de un álbum con 8 y 30 pistas
- [x] 5.3 HTTP y navegador con el build final, a 375 px: cambiar de vista, ajustes del dueño, álbum, compartir
- [x] 5.4 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-discography-lamina.ts` pasa contra Postgres real (BD de scratch): D9 (8 canciones no alcanzan, 10 en 2 discos sí), la página que existe
  solo por sus canciones, discos solo con canciones en la grilla y no en Por disco, numeración entre medios, celdas vacías, preferencias (`CHECK` de `0085`, En vivo,
  vista del dueño en la imagen, que sobreviven a quitar la marca), Lámina de álbum por visitante (umbral de 3, disco ajeno, anónimo con y sin marca, imagen y eventos)
  y lectura de 51 ms con 50 discos de 15 pistas.
- Cambio respecto de la propuesta: la página también existe con solo la vista Por canción. La spec y el diseño lo dicen.
- HTTP sobre el build final: preferencias `200`, sección inválida `400`, sin sesión `401`; anónimo `404` sin marca y `200` con ella, también en `?disco=`; metadatos del
  álbum con su propia imagen. En caliente: grilla en Publicación 0,32 s, Enlace 0,21 s, Historia 0,40 s; álbum entre 0,19 y 0,27 s.
- Navegador con el build final, a 375 px y por el DOM: grilla como tabla con su título, selector de vista, ajustes del dueño que guardan y cambian la vista, Lámina de
  álbum con barras y lista, y Compartir. Sin desplazamiento horizontal de la página.
- Muestras PNG revisadas: grilla con 3, 12 y 25 discos y álbum con 8 y 30 pistas, en los tres formatos. Corregido el Enlace del álbum, que se salía del lienzo.
- La grilla de 20 × 20 tarda unos 1,7 s en Historia generada fuera del servidor, por los cientos de celdas con estrella; con la grilla real de la prueba, 0,4 s.
- `pnpm run typecheck`, `lint` y `build` pasan sobre el código final. La suite completa dio 6911 de 6913: fallaban dos pruebas de la página, por los mocks de la
  propia prueba. Corregidas, sus 23 archivos pasan; la suite completa no se volvió a correr. El primer `build` falló por el script temporal de verificación, ya borrado.
