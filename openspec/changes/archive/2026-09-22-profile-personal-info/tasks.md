## 1. Base de datos y listas cerradas

- [x] 1.1 Verificar el siguiente número de migración libre (hoy `0042`) y crear `drizzle/0042_profile_personal_info.sql`: `app_user.country` y `app_user.pronoun_set` (`TEXT NULL`), `chk_app_user_country` (`country IS NULL OR country ~ '^[A-Z]{2}$'`) y `chk_app_user_pronouns_exclusive` (`pronoun_set IS NULL OR pronouns IS NULL`); reflejarlas en `src/db/schema.ts` y aplicarla en la base de scratch
- [x] 1.2 Crear `src/lib/personal-info.ts` (módulo puro): `COUNTRIES` (los 249 códigos ISO 3166-1 alfa-2 más `XK`), `PRONOUN_SETS` (`he`, `she`, `they`), `isValidCountry`, `isPronounSet`, `countryName(code, locale)` y `countryOptions(locale)` con `Intl.DisplayNames` y `Intl.Collator`; pruebas: sin duplicados, todos en mayúsculas de dos letras, cada código tiene nombre en `es` y en `en` (distinto del código), orden alfabético por idioma, rechaza minúsculas, tres letras y `ZZ`
- [x] 1.3 Agregar `country: 2` a `PROFILE_IDENTITY_LIMITS` (`src/services/social/types.ts`) con su comentario

## 2. Contrato, servicio y exportación

- [x] 2.1 `src/lib/api/schemas.ts`: `country` (código de la lista; vacío o `null` lo borra) y `pronounSet` (`he` | `she` | `they` | `other` | `null`) en `UpdateProfileIdentityRequestSchema` y `UpdateOwnProfileRequestSchema`; `country` y `pronounSet` (clave o `null`) en `ExtendedIdentitySchema`; pruebas de esquema, incluida la que fija que `birthYear`, `birthDate`, `gender`, `firstName` y `lastName` no se aceptan (una petición que solo los trae se rechaza)
- [x] 2.2 `services/profiles/identity.ts` (`IDENTITY_COLUMNS`, `hydrate`, `ExtendedIdentityData`): leer y devolver `country` y `pronounSet`
- [x] 2.3 `updateIdentity`: guardar `country`; modelo de pronombres de tres estados (clave de la lista borra `pronouns`; `other` exige `pronouns` no vacío en la misma petición y deja `pronoun_set` en `NULL`; `null` borra ambos; un cliente que solo envía `pronouns` se trata como «Otro»); traducir la violación de los `CHECK` a `VALIDATION_ERROR` sin cambiar nada; pruebas de servicio de cada camino
- [x] 2.4 `services/profiles/profile-view.ts`: cuando `hidden` (sin acceso a un perfil privado y no es el dueño) vaciar también `country`, `location`, `pronouns` y `pronounSet`, en el mismo punto que la ficha; pruebas: perfil público, privado anónimo, solicitud pendiente, seguidor aprobado y dueño; la bio, los enlaces y los contadores no cambian
- [x] 2.5 `PATCH /api/me/profile` (ruta y prueba): acepta y valida `country` y `pronounSet`, y responde `VALIDATION_ERROR` ante valores fuera de la lista
- [x] 2.6 `services/profiles/data-export.ts`: agregar `country` y `pronounSet` al bloque `account`; pruebas del contenido

## 3. Selector con buscador

- [x] 3.1 Correr las pruebas actuales de `TimezonePicker` y anotar el resultado; extraer la mecánica del combobox a un `SearchablePicker` genérico (opciones con texto de búsqueda, valor, opción «sin valor», textos) y dejar `TimezonePicker` como envoltorio fino que sigue exportando `filterTimezones`; sin modificar sus pruebas y con el mismo resultado
- [x] 3.2 Crear `CountryPicker` sobre `SearchablePicker`: nombres en el idioma actual, opción «Sin país», búsqueda sin distinguir mayúsculas ni tildes, anuncio de cuántos coinciden, teclado y Escape que no cierra el panel; pruebas de componente ("mexico" y "méxico" encuentran México; sin coincidencias)

## 4. Editor y Placa

- [x] 4.1 `OwnerIdentityEditor`: selector de pronombres («Sin especificar», él/ella/elle o he/she/they según el idioma, «Otro» con su campo de hasta 40) con el ejemplo en vivo rotulado «Ejemplo»; selector de país; la etiqueta «Ciudad o región»; el aviso «Solo lo ven quienes pueden ver tu perfil»; estados de carga, éxito y error recuperable y seguimiento de cambios sin guardar; pruebas de componente (cada estado de pronombres, el ejemplo cambia, «Otro» vacío no guarda, el estado inicial deduce «Otro» de un texto libre anterior)
- [x] 4.2 Pasar los valores iniciales nuevos al editor desde `me/settings/profile/page.tsx` y `users/[username]/sections.tsx`; actualizar sus pruebas
- [x] 4.3 `ProfileIdentity`: la etiqueta de pronombres junto al nombre (localizada por el idioma de quien mira, o el texto de «Otro»), y la línea «Ciudad, País · Miembro desde… · hora local» con el nombre del país calculado en el servidor; sin separadores sobrantes ni hueco; pruebas, incluida una que compruebe que un perfil sin los tres datos se ve igual que antes
- [x] 4.4 Comprobar `PrivateProfileCard` y "Ver cómo te ven": un perfil privado sin acceso no dibuja país, ciudad ni pronombres; pruebas
- [x] 4.5 Mensajes `messages/{es,en}/users.json`: etiquetas, opciones de pronombres, frases de ejemplo (es y en), «Sin país», aviso de visibilidad y la etiqueta «Ciudad o región»; verificar que ambos idiomas tienen las mismas claves

## 5. Política de privacidad

- [x] 5.1 `messages/{es,en}/legal.json`: sección «Datos personales opcionales del perfil» (qué datos son, para qué, quién los ve, que nunca se piden al registrarse, cómo borrarlos, y que no se recogen fecha de nacimiento, género ni nombres legales) y un octavo punto en «Por definir…» para la edad mínima en los Términos
- [x] 5.2 `components/legal/LegalPlaceholder.tsx`: incorporar la sección nueva y los 8 puntos; actualizar `legal-pages.test.tsx` (seis secciones pasan a siete y siete puntos pasan a ocho)

## 6. Prueba contra Postgres real

- [x] 6.1 Agregar al smoke contra Postgres real (`scripts/smoke-test-account-settings.ts` o un script propio) una sección de datos personales: los `CHECK` rechazan un país en minúscula o de tres letras y un estado mixto de pronombres; `updateIdentity` recorre los tres estados; los valores anteriores de `pronouns` y `location` se conservan; el perfil privado se vacía para un anónimo y para una solicitud pendiente y se entrega a un seguidor aprobado y al dueño; la exportación incluye los datos y eliminar la cuenta no deja ninguna fila
- [x] 6.2 Correr el smoke completo sobre la base de scratch y confirmar que no dejó fixtures huérfanos

## 7. Verificación, documentación y cierre

- [x] 7.1 `tsc`, `eslint`, `vitest` y `next build` (en un `distDir` aparte, sin pisar el servidor de desarrollo) en verde
- [x] 7.2 Verificar contra un build de producción, no el servidor de desarrollo, que la página de un perfil privado no contiene el país, la ciudad ni los pronombres para un visitante anónimo, y que sí los tiene para el dueño — _Hecho el 2026-09-21 contra `next start` (build de producción): el mismo perfil público muestra «Quilpue», «Chile» y «ella» / «she/her» a un anónimo y, en privado, ni el texto visible ni el HTML/payload los contienen (la bio sí). El caso del dueño no se probó con una sesión en el build de producción: lo cubren las pruebas de `getProfileView` y el smoke contra Postgres._
- [x] 7.3 Probar en el navegador con una cuenta de prueba: elegir país y pronombres, ver el ejemplo en es y en en, ver la Placa, cambiar a perfil privado y comprobar lo que ve un anónimo, y "Ver cómo te ven" (requiere una sesión iniciada por la persona) — _Hecho el 2026-09-21 con `baverav764` (BD scratch): país por buscador (`mexico` -> México), ciudad «Oaxaca», pronombres «Ella» -> se guardaron MX/Oaxaca/she; el ejemplo cambió en vivo en es («Ella lo escuchó…») y en en («added Pride to **her**…»); la Placa mostró el chip «ella» junto al nombre y «Oaxaca, México · Miembro desde… · hora local»; «Ver cómo te ven» y un `curl` anónimo NO mostraron ninguno de los tres, con la bio intacta. Sin bugs de la app. Nota operativa: `.next` se corrompió por procesos next superpuestos (dev + build a un distDir temporal + `next start`); se resolvió con `rm -rf .next` y un dev server fresco. Datos de prueba restaurados al terminar._
- [x] 7.4 Documentar en `docs/05-features/user-profile.md`, `docs/04-api/contracts.md` (`PATCH /api/me/profile`) y `docs/03-data/sql-model.md` (`country`, `pronoun_set` y sus `CHECK`); dejar anotado el cambio de comportamiento de los perfiles privados; actualizar `AGENTS.md` si cambia el procedimiento del smoke
- [x] 7.5 `openspec validate profile-personal-info --strict` y archivar (`## Purpose` ya existe en las specs que se tocan; ver las notas de archivo)
