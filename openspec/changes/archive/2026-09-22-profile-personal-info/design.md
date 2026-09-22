## Context

`app_user` ya guarda `bio` (≤200), `pronouns` (texto libre ≤40) y `location` (texto libre ≤80), más la zona horaria y la identidad musical de la Fase 2 de `rework-account-settings`. Hoy:

- `getProfileView` (`services/profiles/profile-view.ts`) es el único punto que arma la identidad que ve un visitante. Ya vacía la ficha musical y la hora local para quien no tiene acceso a un perfil privado (`hidden = !accessible && relation !== "self"`), pero **entrega** `pronouns` y `location`; `PrivateProfileCard` los dibuja con `ProfileIdentity`.
- Las listas cerradas (roles, géneros, formatos, preguntas, zonas) viven en `src/lib/music-identity.ts` como claves estables, con los nombres en `messages/*/users.json`; la base solo aplica `CHECK` de cardinalidad, no de valores. `TimezonePicker` es un combobox ARIA con buscador para las ~400 zonas.
- El editor de identidad (`OwnerIdentityEditor`) se monta igual en Ajustes y en el modo edición, y guarda con `PATCH /api/me/profile` (`UpdateOwnProfileRequestSchema` → `updateIdentity`).
- La exportación (`services/profiles/data-export.ts`) ya incluye `pronouns` y `location` en `account`.

Decisiones ya tomadas con la persona (ver la propuesta y la maqueta `personal.html`): país de lista cerrada + ciudad libre; pronombres de lista cerrada + «Otro» + ejemplo; país, ciudad y pronombres ocultos a quien no tiene acceso a un perfil privado; sin año de nacimiento, género ni nombre/apellido separados.

## Goals / Non-Goals

**Goals:**

- Guardar el país y los pronombres como **claves estables**, no como texto, para poder localizarlos y validarlos.
- Ocultar país, ciudad y pronombres a quien no tiene acceso, en **un solo punto** que no se pueda olvidar en una vista nueva.
- Reusar lo que ya existe: el editor de identidad, el patrón de lista cerrada, el buscador de `TimezonePicker` y la exportación.
- No perder ningún dato existente: la ubicación y los pronombres libres siguen mostrándose.

**Non-Goals:**

- Cambiar el registro, la visibilidad de la bio, el modelo de acceso a perfiles privados o la moderación de texto libre.
- Usar los pronombres para conjugar la interfaz, mostrar banderas o descubrir personas por país.
- Verificar o preguntar la edad (queda como punto por definir en `/privacy`).

## Decisions

### D1. Dos columnas nuevas; `location` y `pronouns` se conservan

`app_user.country TEXT NULL` con `CHECK (country IS NULL OR country ~ '^[A-Z]{2}$')` y `app_user.pronoun_set TEXT NULL`. Los valores permitidos **no** se validan en la base (lista cerrada en el código), igual que géneros y roles: agregar un país o un pronombre es cambiar código, no una migración. La base solo asegura el **formato** del país y la **exclusión** entre `pronoun_set` y `pronouns` (`CHECK (pronoun_set IS NULL OR pronouns IS NULL)`, `chk_app_user_pronouns_exclusive`).

`location` sigue siendo el texto libre de hasta 80, ahora «ciudad o región»; `pronouns` sigue siendo el texto libre de hasta 40, ahora el valor de «Otro».

*Alternativa descartada:* reemplazar `location` por `country` + `city` y migrar. Obligaría a adivinar el país dentro de un texto libre ("Stgo", "Chile, Santiago") y a perder datos; conservar la columna es gratis y no rompe nada. *Otra descartada:* guardar el nombre del país como texto; impide localizarlo y validar.

### D2. Modelo de pronombres: tres estados en dos columnas

| Estado | `pronoun_set` | `pronouns` |
|---|---|---|
| Sin especificar | `NULL` | `NULL` |
| De la lista | `he` \| `she` \| `they` | `NULL` |
| «Otro» | `NULL` | texto (1–40) |

`he`, `she` y `they` son las claves; se muestran «él», «ella», «elle» en español y «he/him», «she/her», «they/them» en inglés, **según el idioma de quien mira** (una persona con `she` ve «ella» un lector en español y «she/her» uno en inglés). El `CHECK` de D1 hace imposible un estado mixto aunque falle el servicio.

Contrato del `PATCH /api/me/profile`:

- `pronounSet: "he" | "she" | "they"` guarda la clave y borra `pronouns`.
- `pronounSet: "other"` exige `pronouns` no vacío **en la misma petición** (`VALIDATION_ERROR` si falta), guarda el texto y deja `pronoun_set` en `NULL`.
- `pronounSet: null` borra ambos.
- Un cliente anterior que solo envía `pronouns` sigue funcionando: se trata como «Otro» (y vacío lo borra).

La lectura devuelve `pronounSet` (clave o `null`) y `pronouns` (texto libre o `null`); el editor deduce el estado con `pronounSet ? lista : pronouns ? otro : ninguno`. Los pronombres libres que ya existen quedan como «Otro» **sin migrarlos** (no se intenta mapear "ella" o "she/her" a claves: un mapeo automático podría reinterpretar lo que la persona escribió).

### D3. Lista de países en código, nombres con `Intl.DisplayNames`

`src/lib/personal-info.ts` (módulo puro, sin `next/*` ni base, importable por el esquema Zod, el servicio y los editores cliente) exporta:

- `COUNTRIES`: los códigos ISO 3166-1 alfa-2 oficiales (249) más `XK` (Kosovo), como constante.
- `isValidCountry(code)`, `PRONOUN_SETS = ["he", "she", "they"]` e `isPronounSet(value)`.
- `countryName(code, locale)` con `Intl.DisplayNames(locale, { type: "region" })` y `countryOptions(locale)` ordenadas con `Intl.Collator(locale)`.

Una prueba comprueba que **cada** código de la lista tiene nombre en `es` y en `en` (que `DisplayNames` no devuelva el propio código), para atrapar errores de tipeo.

*Alternativas descartadas:* una dependencia (`i18n-iso-countries`, `country-list`): la regla es no agregar dependencias sin necesidad y `Intl` ya está en Node y en los navegadores; una tabla en la base: los países no cambian por usuario y agregaría una consulta a cada perfil; nombres en `messages/*.json`: 250 claves × 2 idiomas que `Intl` ya sabe.

### D4. Un buscador genérico extraído de `TimezonePicker`

Los ~250 países necesitan el mismo buscador que las ~400 zonas (combobox ARIA en línea, filtrar sin distinguir mayúsculas ni tildes, flechas, Enter, Escape que no cierra el panel). Se extrae la mecánica a `SearchablePicker` (recibe las opciones `{ value, label, haystack }`, el valor, `onChange`, la opción «sin valor» y los textos) y `TimezonePicker` y `CountryPicker` pasan a ser envoltorios finos; `filterTimezones` sigue exportándose con el mismo comportamiento. **Las pruebas actuales de `TimezonePicker` (incluida la de Escape con `stopImmediatePropagation`) no se modifican**: son la red de seguridad de la refactorización.

*Alternativa descartada:* un `<select>` nativo. Funciona con teclado, pero con 250 opciones no filtra, es distinto del selector de zona en el mismo panel y su lista desplegable no se puede estilizar; el mockup aprobado ya mostraba el buscador.

### D5. Ocultar para quien no tiene acceso, en el mismo punto que la ficha

`getProfileView` ya calcula `hidden`. Ahí mismo se vacían `country`, `location`, `pronouns` y `pronounSet` (se agregan a lo que hoy se sobrescribe con `EMPTY_MUSIC_IDENTITY`), de modo que **ninguna** vista que consuma `ProfileView` (la Placa, `PrivateProfileCard`, futuras) los reciba. El dueño (`relation === "self"`) y quien tiene acceso (perfil público o seguidor aprobado) los reciben siempre. La bio, los enlaces y los contadores no cambian.

*Alternativas descartadas:* filtrar en `ProfileIdentity` (solo oculta lo dibujado; el dato viaja igual al HTML/RSC); pasar el visor a `getExtendedIdentityByUsername` (el servicio de identidad no conoce al visor y lo usan otros consumidores). La verificación de que no viajan se hace contra un **build de producción**: en desarrollo el payload RSC incluye las filas crudas de las consultas (ver la Fase 2 de `rework-account-settings`).

### D6. Cómo se muestra

- **Pronombres**: un chip pequeño junto al nombre (`ProfileIdentity`), solo si hay valor. Con `pronoun_set` usa `users.pronounSet.<clave>` en el idioma de quien mira; con «Otro», el texto libre.
- **País y ciudad**: al inicio de la línea de datos, «Ciudad, País · Miembro desde … · hora local», omitiendo lo que falte y sin separadores sobrantes. Con solo país se muestra el país; con solo ciudad, la ciudad. El nombre del país se calcula en el servidor con el idioma de la ruta.
- Un perfil sin ninguno de los tres se ve exactamente como hoy.

### D7. El ejemplo de los pronombres es ilustrativo

El editor muestra debajo del selector una frase de ejemplo que cambia con la opción (`users.edit.pronounExample.*`): en inglés, con el posesivo *his / her / their* («Ana added Pride to her want-to-listen list»); en español, donde «su» no varía, con un sujeto («Ana agregó Pride a su lista. Ella lo escuchó por primera vez esta semana»). Es una **ilustración** de cómo se leen los pronombres, no copia real de la aplicación, y así está rotulada («Ejemplo»). Sin elegir, el ejemplo usa la forma neutra. El nombre del ejemplo es el nombre visible de la persona.

La interfaz **no** usa los pronombres para conjugar: hoy solo hay dos textos en inglés que varían por persona («added to their collection», que agrupa a varias personas, y «has not shared their physical collection») y ninguno en español, y usarlos en tarjetas de perfiles sin acceso los filtraría. Es un no-objetivo explícito de la propuesta.

### D8. Exportación, borrado y política

`buildDataExport` agrega `country` y `pronounSet` al bloque `account` (junto a los `pronouns` y `location` que ya salen). Al ser columnas de `app_user`, el borrado de la cuenta las elimina sin cambios; la desactivación no las toca (la cuenta desactivada ya no se muestra). La política `/privacy` (`messages/{es,en}/legal.json`) gana una sección **«Datos personales opcionales del perfil»** que dice qué son (país, ciudad o región, pronombres, bio, zona horaria y hora local), para qué (mostrarlos en tu perfil), quién los ve (todos en un perfil público; quien tenga acceso en uno privado), que nunca se piden al registrarse, cómo borrarlos (vaciar el campo o eliminar la cuenta) y que **no** se recogen la fecha de nacimiento, el género ni los nombres legales; y suma un octavo punto a «Por definir antes de la apertura al público»: fijar la **edad mínima** en los Términos. La prueba de `/privacy` pasa de 7 a 8 puntos y verifica la sección nueva.

### D9. Lo que no se pide, con una prueba que lo fija

Para que la decisión no se pierda, una prueba comprueba que `UpdateOwnProfileRequestSchema` y `UpdateProfileIdentityRequestSchema` no aceptan `birthYear`, `birthDate`, `gender`, `firstName` ni `lastName` (una petición que solo trae esos campos se rechaza con `VALIDATION_ERROR` porque no hay nada que actualizar) y que el formulario de registro sigue teniendo solo usuario, email y contraseña.

## Risks / Trade-offs

- **[Cambio de comportamiento en perfiles privados]** Quien hoy tiene un perfil privado con ubicación o pronombres dejará de mostrarlos a extraños → está anunciado en la propuesta (**BREAKING**), el editor lo explica junto al campo («Solo lo ven quienes pueden ver tu perfil») y queda en la documentación. La persona no pierde ningún dato.
- **[Regresión en `TimezonePicker` al extraer el buscador]** → las pruebas existentes no se tocan y se ejecutan antes y después; la extracción se hace en su propio paso.
- **[La lista de países queda desactualizada]** (códigos nuevos o cambios políticos) → constante de un solo archivo, con la prueba de nombres; el costo de actualizarla es un cambio de código, y los nombres los aporta CLDR, no nosotros.
- **[Los nombres del navegador y del servidor pueden diferir levemente]** (versión de ICU) → el nombre visible en el perfil se calcula en el servidor y el del editor en el cliente, pero el editor solo se muestra ya montado en el cliente, así que no hay desajuste de hidratación.
- **[Estado mixto de pronombres]** por un cliente o un `UPDATE` directo → el `CHECK` de la base lo impide; el servicio traduce el error a `VALIDATION_ERROR`.
- **[Datos identificables juntos]** (nombre, ciudad, país) → todo es opcional, vacío por defecto, sujeto a la privacidad del perfil, se puede borrar y se declara en `/privacy`.
- **[«Otro» admite texto libre]** (ya ocurría con `pronouns`) → mismo límite (40) y misma moderación que hoy; no se agrega superficie nueva.

## Migration Plan

1. Migración manual `0042` (verificar el siguiente número libre): `ALTER TABLE app_user ADD COLUMN country TEXT, ADD COLUMN pronoun_set TEXT` y los dos `CHECK`. Sin backfill: las columnas nacen en `NULL`. Reflejarla en `src/db/schema.ts`.
2. Aplicar en la base de scratch y correr el smoke contra Postgres real (formato del país, exclusión de pronombres, vaciado para un perfil privado, exportación).
3. Verificar el vaciado contra un **build de producción** (no el servidor de desarrollo).
4. **Reversión:** las columnas son opcionales y nadie depende de ellas; el código anterior las ignora y seguiría mostrando `pronouns` y `location`. Quitarlas es un `ALTER TABLE … DROP COLUMN`.

## Open Questions

- Ninguna bloquea la implementación. Queda **para más adelante**, fuera de esta fase: aplicar los pronombres a la interfaz si aparece copia por persona que lo justifique, y la edad mínima en los Términos (anotada en `/privacy`).
