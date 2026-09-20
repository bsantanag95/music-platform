## Context

`user_profile_link` guarda `kind` (conjunto cerrado, `CHECK`) y `url` (≤400). El contrato Zod exige
`z.url({ protocol: /^https?$/ })` y `replaceLinks` reemplaza el conjunto completo en una transacción.
`OwnerLinksEditor` usa un `<input type="url">`, por lo que el navegador valida nativamente y rechaza
`www.link.com`. `ProfileIdentity` pinta cada enlace como texto (`t("linkKind.<kind>")`). No hay
librería de íconos en el proyecto. En la base de pruebas hay 2 enlaces, uno de ellos un Instagram
que apunta a la portada.

## Goals / Non-Goals

**Goals:** una única definición de las reglas por sitio; validar en cliente y servidor con el mismo
código; no romper filas existentes; íconos accesibles sin dependencias.

**Non-Goals:** comprobar que el usuario exista en el sitio; migrar datos; más tipos que X, TikTok y
Spotify.

## Decisions

### 1. Se guarda solo la `url` canónica; el usuario se deriva

No se añade columna `handle`. Para los tipos por usuario el servidor construye la URL canónica
(`https://www.instagram.com/ana`) y solo eso se persiste. Para editar o mostrar, `describeStoredLink`
recupera el usuario a partir de la URL guardada.

*Alternativa descartada:* columna `handle`. Duplicaría la fuente de verdad (habría que mantenerla
coherente con `url`), exigiría backfill y no aporta nada que la URL no permita derivar.

### 2. Un módulo isomórfico `src/lib/profile-links.ts`

Tabla `LINK_SITES` con, por tipo por usuario: nombre, hosts aceptados, expresión del usuario válido,
rutas reservadas, cómo construir la URL y cómo extraer el usuario de una URL. API pura:
`normalizeLinkInput(kind, raw)` → `{ ok, url, handle? } | { ok: false, reason }`,
`describeStoredLink(kind, url)` → `{ consistent, handle, detail }` y `editableValue(kind, url)`. Lo consumen el esquema
Zod (servidor), el editor (cliente) y la vista del perfil, de modo que las reglas no puedan divergir.
Es TypeScript puro, sin `fetch` ni acceso a la base, así que se prueba con tests unitarios.

### 3. Reglas por sitio

| Tipo | URL canónica | Extracción desde un enlace pegado |
|---|---|---|
| Instagram | `https://www.instagram.com/{u}` | primer segmento (excluye `p`, `reel`, `explore`, `accounts`, `stories`…) |
| X | `https://x.com/{u}` | primer segmento en `x.com` o `twitter.com` (excluye `home`, `i`, `intent`, `search`…) |
| TikTok | `https://www.tiktok.com/@{u}` | segmento `@usuario` |
| YouTube | `https://www.youtube.com/@{u}` | segmento `@handle` (los formatos `/channel/…` o `/c/…` no permiten derivar el handle y se rechazan con un mensaje) |
| SoundCloud | `https://soundcloud.com/{u}` | primer segmento (excluye `discover`, `search`, `you`…) |
| Bandcamp | `https://{u}.bandcamp.com` | subdominio (excluye `www`, `daily`) |
| Last.fm | `https://www.last.fm/user/{u}` | `/user/{u}` |
| Discogs | `https://www.discogs.com/user/{u}` | `/user/{u}`, con o sin prefijo de idioma |
| Spotify | `https://open.spotify.com/user/{u}` | `/user/{u}` |

Cada uno valida el usuario con su propia expresión (longitud y caracteres permitidos) y descarta un
`@` inicial. Los parámetros de consulta y el fragmento del enlace pegado se ignoran.

### 4. ¿Usuario o enlace? Se decide por el contenido, no por un punto

Varios usuarios válidos contienen puntos (`ana.perez`), así que "tiene un punto" no distingue un
dominio. Una entrada se trata como enlace solo si empieza por `http(s)://`, contiene `/`, o su primera
parte coincide con un host del sitio (`instagram.com`, `x.com`, `usuario.bandcamp.com`…). Una
entrada que es exactamente el host del sitio (la portada) se rechaza con "falta el usuario". Así
`ana.perez` es un usuario y `instagram.com` no.

### 5. Enlace: esquema implícito y rechazo de esquemas no web

`normalizeWebUrl`: recorta; rechaza espacios; si trae un esquema distinto de `http`/`https`
(`javascript:`, `mailto:`, `ftp:`…) lo rechaza; si no trae esquema antepone `https://`; exige un
`hostname` con al menos un punto (`asdf` no es un sitio); respeta un `http://` explícito; no altera
el resto del texto (no se añade `/` final). Un `host:puerto` no se confunde con un esquema (`:`
seguido solo de dígitos).

**Sitio web y Enlace se unifican.** Eran técnicamente idénticos (misma validación, misma URL): solo
cambiaban la etiqueta y el ícono. Se deja un único tipo, `other`, mostrado como "Enlace" (y como
primero del selector y valor por defecto de una fila nueva). Una migración (`0036`) pasa las filas
`website` a `other`; no es reversible (ya no se sabría cuáles lo fueron), lo que es aceptable porque
nada las distinguía. *Alternativa descartada:* mantener ambos con íconos distintos (globo y cadena);
la distinción era solo cosmética y no la hacía cumplir nada.

### 6. Contrato: `{ kind, value }`

`PUT /api/me/profile/links` recibe `value` (lo que se escribió) y el servidor lo normaliza con el
módulo compartido; la respuesta devuelve `{ id, kind, url, position }` con la `url` canónica, igual
que hoy. El nombre `value` evita llamar "url" a algo que para la mayoría de los tipos es un usuario.
La validación del servidor sigue siendo la garantía; la del cliente existe para dar mensajes por fila.

### 7. Enlaces preexistentes: validación perezosa

Sin migración de datos. `describeStoredLink` devuelve `consistent: false` cuando la `url` guardada no
encaja con su tipo (el Instagram de la portada); entonces la vista muestra un ícono genérico de enlace con el
nombre del sitio y el editor muestra la URL cruda con un aviso. Se valida al guardar: como el editor
reenvía el conjunto completo, una fila que no valide bloquea el guardado con su error por fila hasta
que la persona la corrija o la quite.

### 8. Editor

Cada fila cambia según el tipo: para los tipos por usuario, un `placeholder` propio
(`@usuario`, `nombre-de-tu-banda`…), ayuda específica del sitio y una línea de vista previa del
enlace resultante (`instagram.com/ana`); para sitio web/enlace, un campo de texto con
`placeholder="ejemplo.com"`. **El `input` deja de ser `type="url"`** (pasa a `type="text"` con
`inputMode="url"`, `autoCapitalize="off"` y `spellCheck={false}`), lo que elimina la validación
nativa del navegador. Los errores se muestran por fila con `role="alert"`, asociados al campo con
`aria-describedby`, y salen de los mensajes localizados según el motivo devuelto por el módulo.
Al cambiar el tipo se conserva lo escrito y se revalida.

### 9. Íconos: SVG incrustados de simple-icons (CC0)

Un componente `LinkKindIcon` con las rutas de los nueve íconos de marca (tomadas de simple-icons,
dominio público CC0) más una cadena dibujada a mano para Enlace. Se
incrustan en vez de añadir la dependencia `simple-icons`: solo se usan diez formas y el proyecto evita
dependencias innecesarias. Cada enlace es un `<a>` con `aria-label` ("Instagram: @ana", o "Enlace:
ejemplo.com") y `title`; el ícono es `aria-hidden`. Se conserva el borde y el hover actuales.

### 10. Migración de `kind`

El `CHECK` de la migración 0014 quedó sin nombre explícito; el espejo de `schema.ts` lo llama
`chk_user_profile_link_kind`. La migración elimina ambos nombres (`DROP CONSTRAINT IF EXISTS`) y deja
uno solo, `chk_user_profile_link_kind`, con los once tipos. No toca filas.

## Risks / Trade-offs

- **Un sitio cambia su formato de URL** → las reglas viven en una sola tabla con tests por sitio; un
  cambio es una edición local.
- **Usuarios de Discogs/Spotify que quieren enlazar un artista, sello o playlist** → estos tipos
  quedan como "perfil de usuario"; para una página concreta está Enlace. Queda dicho en el
  mensaje de ayuda del campo.
- **Bandcamp con dominio propio** → no es un subdominio de `bandcamp.com`; se enlaza como Enlace.
- **Cambio de contrato (`url` → `value`)** → breaking solo para clientes directos; se documenta y el
  editor es el único cliente conocido.
- **Íconos de marca incrustados** → uso de marcas conforme a su carácter identificativo (enlazar a la
  propia cuenta); si más adelante se quiere otra estética se sustituyen las rutas sin tocar el resto.
- **Una fila legada bloquea guardar el conjunto** → deliberado (validación perezosa) y con mensaje
  claro por fila; quitar la fila lo resuelve.

## Migration Plan

1. Migraciones SQL manuales (siguientes números libres; verificar antes): `0035` amplía el `CHECK`
   de `kind` y `0036` convierte `website` en `other` y lo retira del `CHECK`.
2. Desplegar código: acepta los tipos nuevos y el contrato `value`.
3. *Rollback:* revertir el código y restaurar el `CHECK` anterior; si ya hay filas `x`/`tiktok`/
   `spotify`, primero convertirlas a `other` (la migración inversa lo documenta).

## Open Questions

- Ninguna bloqueante. Ampliar con más redes (Bluesky, Threads, Mastodon…) queda como continuación.
