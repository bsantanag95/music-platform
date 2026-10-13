# ADR 0036 — Colecciones de Explorar: selección editorial y automáticas por separado, con página propia y archivo

## Estado

Aceptado (cambio `split-explore-collections`, 2026-10). Se apoya en [ADR 0033](0033-colecciones-destacadas-generadas-por-plantillas.md),
[ADR 0034](0034-consola-editorial-de-destacadas.md) y [ADR 0035](0035-colecciones-del-dia-0.md).

## Contexto

El riel "Colecciones destacadas" mezclaba dos cosas: la selección editorial (humana, subjetiva) y las colecciones generadas
por plantilla (efemérides, premios, curiosidades, más adelante comportamiento de la comunidad). Seis tarjetas para ambas las
obligaba a competir por el mismo espacio y escondía que lo automático puede crecer sin límite. Además las colecciones
vencidas ya se conservan (públicas y por URL), pero no había dónde recorrerlas.

## Decisión

1. **Dos riles** en `/explore`: "Selección editorial" (filas `source='curated'`) y "Descubre por datos" (`source='template'`),
   cada uno con su orden (`weight` desc, `rank` asc) y su tope de 6. El grupo se deriva de `source`: sin columna nueva ni
   migración. El rail editorial se omite mientras no haya ninguna colección publicada.
2. **Nombre neutro, sin "Hoy".** Muchas automáticas no son de actualidad (Ganadores del Grammy, Un disco por década);
   «Hoy en la música» queda reservado para una futura sección de efemérides de personas.
3. **Familia por plantilla, en código** (`collections/families.ts`): `ephemeris`, `awards`, `releases`, `discovery`,
   `community`. Se muestra en la tarjeta de las automáticas y filtra el archivo. Una clave que ya no está en el registro
   cae a `discovery`, así el archivo no pierde colecciones de plantillas retiradas.
4. **Página propia `/explore/collections`**, no fusionada con Listas: selección editorial vigente (hasta 48), automáticas
   vigentes por familia y archivo de las vencidas (24 por página, filtro por familia). `/lists` es social; las colecciones
   las produce la plataforma. `/lists` → Destacadas excluye las automáticas; las curadas siguen en ambas puertas porque son
   listas oficiales (ADR 0013), sin duplicar datos.
5. **Orden por grupo en la consola.** `PUT /featured/order` recibe `group` y el conjunto es el vigente de ese grupo; reordenar
   la selección editorial no mueve las automáticas y «dentro del tope» se evalúa contra el rail de cada grupo. Contrato
   cambiado: `group` es obligatorio.
6. **La Inicio anónima no cambia**: conserva `listFeaturedCollections()` (mezclado, tope 6).

## Alternativas descartadas

- **Columna `group` o `family` en la fila:** duplica `source` o se pierde con una plantilla retirada, y exige migración.
- **Fusionar la página con Listas:** mezcla contenido de la plataforma con listas de personas y diluye la identidad de ambas.
- **Un rail con pestañas** (editorial/automático): oculta la mitad del contenido y complica la navegación rápida.
- **Un único orden compartido en la consola:** reordenar lo editorial movería lo automático y viceversa.
- **«Hoy en la música» como nombre del rail automático:** promete actualidad que muchas colecciones no tienen.

## Consecuencias

- Al lanzar, el rail editorial está vacío (no hay curaduría todavía) y no se muestra; la portada la lleva "Descubre por datos".
- Dos colecciones del día 0 (`new-releases`, `upcoming`) se parecen a los rieles de Novedades y Próximos lanzamientos; la
  página de colecciones es donde su archivo cobra sentido. Si molestan en la portada, se retiran del registro sin tocar el modelo.
- El archivo de `genre-spotlight` crece ~52 colecciones al año; el paginado y el filtro lo mantienen manejable.
- Agregar una plantilla solo exige declarar su familia; no cambia la portada.
- Pendiente (cambios siguientes): plantillas de premios por género, curiosidades del catálogo, efemérides de artistas
  (cumpleaños y homenajes) y colecciones de comportamiento de la comunidad.
