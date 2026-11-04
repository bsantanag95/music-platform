## 1. Base de datos y medición

- [x] 1.1 Crear `drizzle/0079_share_event.sql` (tabla, `CHECK` de tipo, canal, formato y referencia, índices) y aplicarla en la BD de scratch
- [x] 1.2 Espejar `share_event` en `src/db/schema.ts` (tipo `ShareEventRow`) y documentarla en `docs/03-data/sql-model.md`
- [x] 1.3 Reutilizar el limitador de `src/services/auth/rate-limit.ts` con claves por espacio de nombres (`share-image:ip:…`, `share-event:ip:…`), como ya hacen avatar y exportación
- [x] 1.4 Servicio `src/services/share/events.ts` (listas cerradas compartidas, inserción) + `POST /api/share/events` con Zod, límite por IP, `204`, envuelto en `with-error-handling`; pruebas de validación, límite y que no guarda usuario ni IP
- [x] 1.5 Borrar los `share_event` de tipo `profile` de la cuenta en la eliminación de cuenta (`account-lifecycle.ts`), con prueba

## 2. Recursos de marca

- [x] 2.1 Pedir permiso y vendorizar en `assets/fonts/` los TTF estáticos de Space Grotesk, IBM Plex Mono y Source Serif 4 (pesos usados por la app) con sus `OFL.txt`; `outputFileTracingIncludes` en `next.config.mjs`
- [x] 2.2 Cargador de fuentes memorizado por proceso (`src/services/share/fonts.ts`) con prueba
- [x] 2.3 `src/lib/share/brand-tokens.ts` + prueba que compara con `src/app/globals.css`
- [x] 2.4 `src/lib/share/score-scale.ts` (tramos, colores, regla de solo estrellas, rangos de la leyenda) + pruebas de tramos, de "sin número inventado" y de contraste ≥4.5:1
- [x] 2.5 Extraer el glifo del monograma de `Logo.tsx` a una constante compartida (sin cambio visual)

## 3. Renderizador y marco

- [x] 3.1 `src/services/share/images.ts`: obtener carátula / foto / avatar por el pipeline existente, timeout, `sharp` a PNG sin ampliar (≤250 px en carátulas), respeto de `cover_blocked_at`, fallback; pruebas con fetch simulado (WebP, fallo, retiro)
- [x] 3.2 Componentes del marco en `src/services/share/frame/` (`LaminaFrame`, `BrandSignature`, `CoverTile`, `ScoreChip`, `ScaleLegend`, `CreditsLine`, `IdentityBadge`)
- [x] 3.3 Imagen genérica ("Contenido no disponible", es/en)
- [x] 3.4 Route handler `GET /api/share/image/[kind]/[ref]` (runtime Node, validación de `kind`/`format`/`locale`, `VALIDATION_ERROR`, genérica con 200, caché por versión, `download=1`, límite por IP); pruebas del handler
- [x] 3.5 Revisión visual: lámina de prueba de cada tipo renderizada a PNG en la carpeta de scratch y ajuste de los colores de la escala

## 4. Objetivos por tipo

- [x] 4.1 Tipo `ShareTarget`, cálculo de versión y `buildShareMetadata` (`openGraph`, `twitter`, canónica sin query, `og:locale`, `alt`, URL absoluta)
- [x] 4.2 Objetivos de álbum y canción (media con umbral de 5) con sus cuerpos y pruebas
- [x] 4.3 Objetivo de artista (foto con crédito o monograma) con cuerpo y pruebas
- [x] 4.4 Objetivos de género, ceremonia, clase de salón y colección (mosaico de hasta 4, título por idioma) con cuerpos y pruebas
- [x] 4.5 Objetivos tipográficos de los índices de premios, salones y colecciones (la ficha de un premio o salón redirige a su última ceremonia o clase)
- [x] 4.6 Objetivo de perfil como anónimo (identidad pública; Tarjeta de Identidad solo con acceso; desactivada → genérica) con pruebas de perfil público, privado y desactivado

## 5. Metadatos en las páginas

- [x] 5.1 `metadataBase` desde `NEXT_PUBLIC_APP_URL` en el layout raíz, con fallback local
- [x] 5.2 Conectar `buildShareMetadata` en los `generateMetadata` de álbum, artista y canción (layouts y pestañas heredan)
- [x] 5.3 Conectar género, premios (índice y ceremonia), salones (índice y clase) y colecciones (página y detalle)
- [x] 5.4 Conectar el perfil (`/users/[username]`) calculado como anónimo
- [x] 5.5 Pruebas de metadatos: URL absoluta y versionada, sin `via`, dueño de perfil privado ve lo mismo que un anónimo

## 6. Hoja de compartir

- [x] 6.1 `src/lib/share/channels.ts` (URL por canal con `via`, nombre de archivo de descarga) + pruebas
- [x] 6.2 `ShareButton` y `ShareSheet` sobre `Dialog`: vista previa, menú nativo condicional, copiar con fallback a campo seleccionado, atajos, descarga, registro de eventos sin bloquear; hoja inferior en pantallas angostas
- [x] 6.3 Textos `es`/`en` y `pnpm run i18n:client-messages`
- [x] 6.4 Botón Compartir en las cabeceras de álbum, artista, canción, género, ceremonia, clase de salón, colección y perfil
- [x] 6.5 Pruebas de la hoja: orden de acciones, sin `navigator.share`, portapapeles bloqueado, cancelar el menú nativo no registra, Escape devuelve el foco

## 7. Documentación

- [x] 7.1 ADR `0049-imagenes-para-compartir-y-mosaicos-de-caratulas.md` y sección en `docs/03-data/data-licensing.md`
- [x] 7.2 `docs/04-api/contracts.md` (imagen y eventos) y `docs/04-api/errors.md` (`RATE_LIMITED` en estos endpoints)
- [x] 7.3 `docs/01-domain/business-rules.md`: visibilidad de lo compartido y medición sin datos personales
- [x] 7.4 `docs/05-features/sharing.md`: D1, D3, D6 y D13 confirmadas, avatares existentes, estado del bloque A; índices de `docs`
- [x] 7.5 `NEXT_PUBLIC_APP_URL` como obligatoria en `.env.example` / notas de despliegue

## 8. Verificación

- [x] 8.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 8.2 Servidor de desarrollo desde el worktree: abrir cada tipo de imagen, revisar metadatos con `curl` como anónimo y probar la hoja en escritorio y en ancho de móvil
- [x] 8.3 Medir el tiempo de generación (en frío y en caliente) contra el presupuesto de `sharing.md` y anotarlo en el cambio

### Resultados de la verificación (2026-11-04)

- `typecheck`, `lint` (0 errores; las 8 advertencias son de archivos previos) y `build` pasan; suite completa en verde.
- Servidor de producción (`next start`, BD de scratch), segundo pedido de la misma imagen:
  álbum ~0,10–0,18 s, ceremonia ~0,11–0,20 s, artista con foto ~0,14–0,23 s, perfil ~0,07–0,09 s, género ~0,4–0,5 s.
  En frío: álbum ~0,5 s, artista con foto ~0,6 s, género ~3,2–3,5 s (cuatro carátulas remotas de CAA, 1,8–2,7 s cada
  una). El presupuesto de `sharing.md` (Enlace < 300 ms en caliente) se cumple salvo en los mosaicos, que dependen de
  CAA; con la caché inmutable del CDN cada versión se genera una sola vez.
- Hallazgo corregido durante la verificación: una carátula que no llegaba a tiempo dejaba la imagen con el recuadro
  tipográfico **cacheada como inmutable**. Ahora una imagen degradada sale con caché corta, los fallos se recuerdan
  5 minutos y el timeout por fuente pasó de 3 a 5 s.
- Metadatos revisados con `curl` como anónimo en las 11 páginas de destino (`og:url` sin `via`, imagen absoluta y
  versionada, perfil privado sin bio). Hoja probada en el navegador en escritorio y a 375 px (hoja inferior, sin
  desplazamiento horizontal, atajos en dos columnas, respaldo del portapapeles).
