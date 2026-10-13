# ADR 0037 — Títulos y rutas de las colecciones generadas por idioma

## Estado

Aceptado (cambio `localize-collection-titles`, 2026-10). **Reemplaza** la consecuencia "Los títulos se guardan en español
(una sola cadena por lista)" del [ADR 0035](0035-colecciones-del-dia-0.md) y la decisión de títulos fijos del
[ADR 0033](0033-colecciones-destacadas-generadas-por-plantillas.md). Complementa [ADR 0036](0036-colecciones-editorial-y-automatica.md).

## Contexto

Las colecciones generadas guardaban su título como una sola cadena en español en `user_list.title`
("Novedades esenciales", "Cumplen años en octubre"). Con la interfaz en inglés el título no se entendía, y la URL mezclaba
idiomas: `/users/exploracion/lists/novedades-esenciales-<id>` combinaba las rutas fijas en inglés (`users`, `lists`), el
nombre de usuario de la cuenta curadora (`exploracion`) y un slug sacado del título en español. Las colecciones son
contenido de la plataforma; deben leerse y compartirse en el idioma de quien las ve.

## Decisión

1. **El título se deriva al leer** de `(template_key, period_key)` y del idioma (`collections/titles.ts`, función pura): el
   período ya guarda año, mes, semana, familia de géneros o premio. No se persiste ninguna traducción y no hay migración.
   `user_list.title` se conserva como título canónico en español y como respaldo; las lecturas nunca lo modifican.
2. **Catálogo de textos en TypeScript**, no en `messages/*.json`: lo usan servicios, páginas de servidor y componentes de
   cliente, y no debe arrastrar el catálogo completo al bundle. Una prueba de paridad exige las mismas plantillas y
   marcadores en es y en, y que los nombres de familia coincidan con `messages/{es,en}/catalog.json`.
3. **Los períodos llevan año** ("Cumplen años en octubre de 2026"): el archivo conserva el mismo mes de años distintos y
   necesita desambiguarlos.
4. **Falla suave.** Plantilla desconocida o período ilegible → se muestra el título guardado; nunca una clave cruda ni un error.
5. **La localización ocurre en la presentación.** Los servicios devuelven la referencia (`templateKey`, `periodKey`) junto
   al título guardado; así las respuestas de API (guardadas, en seguimiento) no necesitan el idioma de la petición.
   `generatedRefsFor` / `findGeneratedCollection` resuelven la referencia en una consulta por lote, y `presentList(list,
   locale)` devuelve `{ title, href }` para los listados de cliente.
6. **Ruta propia bajo Explorar:** `/explore/collections/<slug>-<id>`, con el slug del título del idioma activo. Resuelve por
   id, canonicaliza con 308 (nuevo tipo `collection` de `resolveCatalogRoute`) y responde 404 si la lista no es una
   colección generada pública y visible. La URL no contiene la cuenta curadora.
7. **El dueño se muestra como la plataforma** ("Exploración" / "Explore"), sin enlace a un perfil; guardar y seguir siguen
   funcionando por id.
8. **Redirect de la ruta antigua:** `/users/<usuario>/lists/<lista>` responde 308 a la ruta de colecciones si la lista es
   una colección generada; las demás listas no cambian.
9. **Las colecciones curadas no cambian:** siguen siendo listas de la cuenta curadora con su título y su ruta de lista.
10. **La pestaña de listas del perfil de `@exploracion` deja de listar las generadas** (no son listas personales; se
    descubren en Explorar), igual que `/lists` desde el ADR 0036.

## Alternativas descartadas

- **`titleEs` / `titleEn` en la fila:** duplica datos derivables, exige migración y se desfasa si cambia la redacción.
- **Localizar en los servicios** (recibir `locale`): las rutas de API no conocen el idioma y obligaría a propagarlo por
  todas las capas.
- **Cambiar el nombre de usuario `exploracion`:** invasivo (cooldown de nombres, referencias en código y seeds) y no
  resuelve el slug.
- **Slug neutro solo con el id:** URLs ilegibles y sin valor para quien comparte el enlace.
- **Redirigir también las colecciones curadas:** son listas escritas por una persona en un idioma; su traducción es una
  decisión editorial aparte.

## Consecuencias

- Ningún texto ni URL de una colección generada exige saber español.
- Los títulos de la **selección editorial** siguen en el idioma en que se escribieron. Traducirlos exige guardar título y
  descripción por idioma (tabla nueva) y es un cambio aparte.
- El slug de la URL cambia con el idioma: cada idioma tiene su dirección canónica y el `id` resuelve cualquiera.
- Los enlaces antiguos a colecciones generadas siguen funcionando por el redirect permanente.
- Agregar una plantilla exige declarar su título en los dos idiomas (la prueba de paridad lo impone).
