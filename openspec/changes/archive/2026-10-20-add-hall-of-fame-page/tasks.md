## 1. Lectura y enlaces

- [x] 1.1 `read.ts`: `getAwardKind(slug)` (con `cache`) que devuelve el tipo del premio o `null`.
- [x] 1.2 `award-links.ts`: `hallOfFameIndexHref`, `hallHref` y `hallClassHref`.
- [x] 1.3 `HallOfFameTile` (enlace principal y clases anteriores), `HallOfFameExploreSection` ("Ver todos") y `HallOfFameClassView` (miga
  "Salón de la Fama" y fila de años) usan los enlaces nuevos.

## 2. Rutas

- [x] 2.1 `hall-of-fame/page.tsx`: encabezado, `HallOfFameTileGrid detailed`, por salón el riel de las incorporaciones de su última clase
  con "Ver todas las clases", y mensaje de vacío sin salones; metadatos.
- [x] 2.2 `hall-of-fame/[hall]/page.tsx` (redirige a la clase más reciente) y `hall-of-fame/[hall]/[year]/page.tsx` (`HallOfFameClassView`);
  no encontrado si el premio no es un salón o el año no existe.
- [x] 2.3 `awards/[award]` y `awards/[award]/[year]`: `permanentRedirect` a la ruta nueva cuando el premio es un salón; el historial de
  categoría de un salón sigue sin existir.
- [x] 2.4 `awards/page.tsx`: quitar el bloque de salones, añadir el enlace "Salones de la fama →" si hay salones y ajustar el mensaje de
  vacío (solo cuentan las competencias).
- [x] 2.5 Mensajes es/en: índice (título, descripción, vacío, enlace desde `/awards`, "Ver todas las clases") y miga; quitar las claves
  que dejen de usarse.

## 3. Pruebas

- [x] 3.1 Rutas: índice (con dos salones, sin salones), clase, salón sin año, premio competitivo no encontrado, redirecciones antiguas
  (es y en, con y sin año) y `/awards` sin bloque y con enlace.
- [x] 3.2 Componentes: tarjeta, sección de Explorar y vista de la clase con las URL nuevas y la miga nueva; actualizar las pruebas que
  fijaban `/awards/<salón>`.
- [x] 3.3 Verificar en el navegador (es y en, escritorio y móvil) el índice, una clase, las redirecciones y Explorar → "Ver todos".

## 4. Documentación

- [x] 4.1 `docs/05-features/awards.md` (rutas de los salones) y `docs/05-features/explore.md` ("Ver todos" → `/hall-of-fame`).
- [x] 4.2 ADR 0044: nota breve de las rutas propias (un ADR existente solo recibe nota).

## 5. Cierre

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
