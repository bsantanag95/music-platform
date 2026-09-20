## 1. Reglas compartidas

- [x] 1.1 Ampliar `PROFILE_LINK_KINDS` en `src/services/social/types.ts` con `x`, `tiktok` y `spotify`;
      exportar los subconjuntos "por usuario" y "web" desde el módulo de reglas
- [x] 1.2 `src/lib/profile-links.ts` (TypeScript puro, sin `fetch` ni base): tabla `LINK_SITES` por tipo,
      `normalizeWebUrl`, `normalizeLinkInput(kind, raw)` con motivos de rechazo, `parseStoredLink(kind,
      url)` y una función de etiqueta (`sitio + usuario` o dominio)
- [x] 1.3 Tests unitarios por sitio: usuario simple y con `@`, enlace pegado del sitio correcto (con
      parámetros y `www.`/`m.`), alias (`twitter.com`), enlace de otro sitio, portada sin usuario, rutas
      reservadas, usuario con punto que no es dominio, límites de longitud y caracteres, YouTube sin
      handle, Bandcamp por subdominio, Discogs con prefijo de idioma; y para web: sin esquema, `http://`
      explícito, `host:puerto`, `javascript:`/`mailto:`/`ftp:`, sin dominio y espacios

## 2. Contrato y servidor

- [x] 2.1 Verificar el siguiente número de migración libre y el nombre real del `CHECK` de `kind` en el
      catálogo de la base; migración SQL que lo reemplaza por `chk_user_profile_link_kind` con los once
      tipos; espejo en `src/db/schema.ts`; `docs/03-data/sql-model.md`
- [x] 2.2 `src/lib/api/schemas.ts`: `ProfileLinkInputSchema` pasa a `{ kind, value }` y normaliza con el
      módulo compartido (la `url` canónica ≤400); `ReplaceProfileLinksRequestSchema` y el tipo
- [x] 2.3 `replaceLinks` (`src/services/profiles/identity.ts`) persiste las URLs normalizadas; la ruta
      `PUT /api/me/profile/links` y sus tests (valores válidos, alias, rechazos, sexto enlace, sin sesión)
- [x] 2.4 `docs/04-api/contracts.md`: cuerpo `{ kind, value }`, tipos nuevos y reglas por tipo

## 3. Íconos y vista del perfil

- [x] 3.1 Obtener de simple-icons (CC0) las rutas SVG de Instagram, X, TikTok, YouTube, SoundCloud,
      Bandcamp, Last.fm, Discogs y Spotify, sin añadir la dependencia; dibujar el globo y la cadena;
      componente `LinkKindIcon` (`aria-hidden`, `currentColor`) y nota de licencia
- [x] 3.2 `ProfileIdentity`: cada enlace como ícono con `aria-label` ("Instagram: @ana" / dominio),
      `title`, apertura en pestaña nueva con `rel` seguro y ícono genérico para un enlace que no
      coincide con su tipo; tests

## 4. Editor

- [x] 4.1 `OwnerLinksEditor`: campo por tipo (placeholder y ayuda propios, vista previa del enlace, ejemplo de
      dominio en web), `type="text"` con `inputMode="url"` (sin validación nativa), validación por fila con las
      reglas compartidas, error localizado con `role="alert"` y `aria-describedby`, revalidación al
      cambiar el tipo, y aviso en las filas heredadas que no coinciden con su tipo
- [x] 4.2 Mensajes `es`/`en`: etiquetas de los tipos nuevos, motivos de error por sitio, ayuda,
      prefijos y vista previa; sin claves huérfanas
- [x] 4.3 Tests del editor: entrada por tipo, error por fila sin enviar la petición, `www.link.com` sin
      aviso nativo, vista previa, cambio de tipo, fila heredada bloqueando el guardado y quitar la fila

## 5. Verificación y cierre

- [x] 5.1 `typecheck`, `lint`, `test` y `build` en verde; aplicar la migración a la base de pruebas
- [x] 5.2 En el navegador (con una cuenta iniciada): guardar un enlace de cada tipo, pegar enlaces
      completos y ajenos, `www.link.com`, el enlace heredado, y ver los íconos en el perfil de otra
      cuenta y en móvil
- [x] 5.3 Actualizar `docs/05-features/user-profile.md` (sección Identidad) y la memoria
      `profile-links-validation`; `openspec validate add-profile-link-validation --strict`

## 6. Unificar Sitio web y Enlace

- [x] 6.1 Migración `0036` que pasa las filas `website` a `other` y retira `website` del `CHECK`;
      espejo en `src/db/schema.ts`
- [x] 6.2 Quitar `website` de `PROFILE_LINK_KINDS`, de las reglas (`WEB_LINK_KINDS` = solo `other`), del
      ícono (sin globo), de los mensajes es/en y del valor por defecto de una fila nueva (`other`)
- [x] 6.3 Actualizar los tests y añadir los que fijan que `website` ya no existe; alinear la spec, el
      diseño y la documentación

