# Convenciones — music-platform

## Nombres

- **Base de datos**: nombres de tablas y columnas en `snake_case`, en singular (`artist`, no `artists`; `release_group`, no `release_groups`).
- **TypeScript/frontend**: `camelCase` para variables y funciones, `PascalCase` para componentes y tipos.
- **Rutas de API**: `kebab-case` (`/api/release-group/:id`).
- **Archivos de documentación**: `kebab-case.md`.

## Identificadores

- Todas las entidades usan `UUID` como clave primaria, no IDs autoincrementales (ver ADR correspondiente).
- Las entidades sincronizadas desde MusicBrainz guardan además su `mbid` (UUID de MusicBrainz) como columna separada y única, para poder hacer upsert idempotente sin duplicar registros.

## Timestamps

- Toda tabla con datos generados por usuarios incluye `created_at` (`TIMESTAMPTZ`, default `now()`).
- Las tablas mutables (ej. `rating`) incluyen además `updated_at`, mantenido por trigger, nunca actualizado manualmente desde la aplicación.

## Borrado

**Decisión confirmada** — ver ADR 0009. `rating` y `comment` usan borrado físico (`DELETE`
real), no soft-delete. Ningún query ni migración nueva debe agregar una columna `deleted_at`
a estas tablas sin reabrir el ADR.

## Autenticación

**Decisión confirmada** — ver ADR 0008, ADR 0010 y `02-architecture/auth.md` para el detalle completo.
Resumen normativo:

- Sesiones server-side con token opaco en cookie `httpOnly`/`secure`/`sameSite=lax`, nunca JWT.
- Contraseñas con Argon2id, nunca un hash débil ni texto plano.
- `app_user.password_hash` es nullable — deja espacio para OAuth futuro sin migración destructiva.
- El `user_id` de toda mutación de `rating`/`comment` sale de la sesión, nunca del body/params.
- Las identidades de proveedores OAuth/OIDC viven en `auth_identity`, nunca en columnas específicas
  de `app_user` como `google_id` o `apple_id`.
- Para proveedores OIDC, `provider_account_id` representa el sub y provider identifica
  inequívocamente el issuer. La pareja (`provider`, `provider_account_id`) es única.
- Los adaptadores de proveedores viven en `src/services/auth/providers/`; los route handlers OAuth
  viven en `src/app/api/auth/`. El frontend nunca recibe secretos, intercambia authorization codes
  ni valida tokens del proveedor.
- Los flujos OAuth/OIDC utilizan Authorization Code con `state` y PKCE; los flujos OIDC utilizan
  además `nonce`.
- La vinculación de identidades externas con usuarios existentes es explícita y no se realiza
  automáticamente por coincidencia de email.
- La sesión usa expiración fija, permite sesiones múltiples, rota tras autenticación y eventos
  sensibles, y no rota en cada request normal. La revocación puede ser individual o global.
- Las sesiones expiradas se limpian mediante job periódico y limpieza oportunista no bloqueante.

## Errores HTTP

- Los route handlers devuelven `{ error, code }` ante errores y los códigos estables se documentan
  en `docs/04-api/errors.md`. El frontend usa `code` para localizar el mensaje y nunca muestra el
  texto crudo de `error`.

## Internacionalización (i18n)

**Decisión confirmada** — ver ADR 0007 y `02-architecture/i18n.md` para el detalle completo de
la arquitectura. Resumen normativo para uso diario:

- **Rutas de página**: slugs neutros en inglés, iguales para todos los locales (`/search`, no
  `/buscar`; `/artist/[id]`, no `/artista/[id]`). El locale vive exclusivamente como segmento de
  ruta (`src/app/[locale]/...`), nunca traducido en el slug mismo. Esto corrige la propuesta
  original de `03-best-practices.md`, que sugería slugs en español antes de que se confirmara
  soporte multi-idioma.
- **Rutas de API**: sin cambios — siguen en inglés (`/api/catalog/...`), como ya estaba definido.
- **Catálogos de mensajes**: `messages/{locale}/{namespace}.json`, namespaces por dominio
  (`common`, `catalog`, `errors`), nunca por página. Ver `i18n.md` §6 para la estructura completa.
- **`components/ui/`** nunca importa `useTranslations` ni conoce el locale activo — recibe texto
  ya traducido vía props requeridas (nunca defaults hardcodeados). Ver `i18n.md` para el
  razonamiento.
- **Navegación programática** (`useRouter`, `Link`) siempre se importa desde
  `src/i18n/navigation.ts`, nunca directo de `next/navigation` — de lo contrario se pierde el
  prefijo de locale al navegar.
- **Datos del catálogo musical** (nombre de artista, título de álbum/canción, biografía) nunca
  se traducen — se muestran tal cual llegan de MusicBrainz. i18n aplica solo al _chrome_ de la
  interfaz.

## Tailwind — nombres de clases canónicos (v4)

**Decisión confirmada.** Se usan siempre los nombres canónicos de Tailwind v4, no los alias
de compatibilidad heredados de v3. El editor los marca vía `suggestCanonicalClasses`
(`tailwindcss(suggestCanonicalClasses)`); esa sugerencia se acepta.

- Caso frecuente: `bg-gradient-to-*` → **`bg-linear-to-*`** (además existen `bg-radial`,
  `bg-conic`). Es un rename puro: el CSS generado es idéntico, sin riesgo visual.
- **Cuidado — no todos los renames son inocuos.** Algunas utilidades de v3 se renombraron
  *y* se recalibraron en v4, así que aplicar la sugerencia a ciegas cambia el resultado:
  - `shadow-sm` (v3) → `shadow-xs` (v4); `shadow` (v3) → `shadow-sm` (v4).
  - Ídem para `blur-*`, `rounded-*` en el escalón `sm`, y `outline-none` → `outline-hidden`
    (el `outline-none` de v4 significa `outline-style: none`, otra cosa).
  - En estos casos se decide clase por clase revisando el render, no con un reemplazo global.
- No se folda en trabajo de feature: la migración de nombres va en su propio commit chico.
- Sin dependencia de lint nueva para esto por ahora (regla de PRODUCT.md: toda dependencia
  nueva necesita justificación explícita). Si más adelante se quiere enforcement en CI,
  evaluar `eslint-plugin-better-tailwindcss` (`no-deprecated-classes`) como decisión aparte.
  Mientras tanto: la pista del editor + corrección oportunista al tocar cada archivo.

## Principio general

Toda convención nueva que surja durante el desarrollo se agrega a este documento en el momento en que se decide, no después — así ninguna herramienta de IA ni colaborador humano tiene que inferir el estilo del proyecto leyendo código existente.
