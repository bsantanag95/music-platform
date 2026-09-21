## Why

El perfil ya tiene bio, pronombres y ubicación, pero los tres son texto libre: "Chile", "chile" y "Stgo" son tres valores distintos para el mismo país, los pronombres se escriben de cualquier forma y no hay manera de que la interfaz los muestre o los use de manera consistente. Además, la identidad "pública" de un perfil **privado** (bio, pronombres y ubicación) se entrega a cualquier visitante anónimo: al sumar más datos personales, una persona que eligió privacidad los seguiría exponiendo. Antes de cerrar la gestión del perfil conviene decidir qué datos personales se piden y cuáles no.

## Goals

- **País de una lista cerrada** más **ciudad o región** en texto libre (la "ubicación" actual pasa a ser solo la ciudad o región).
- **Pronombres de una lista cerrada** (él, ella, elle) con **«Otro»** de texto libre y un **ejemplo en vivo** en el editor, al estilo de Letterboxd.
- **Regla de privacidad**: país, ciudad y pronombres siguen la misma regla que la ficha. En un perfil privado solo los ve quien tenga acceso.
- Todo **opcional, vacío por defecto y borrable**, sin pedirse nunca en el registro.
- Los datos nuevos entran en la **exportación**, se borran con la cuenta y se declaran en la política de privacidad `/privacy`.
- Dejar por escrito **qué no se pide** (nombre y apellido separados, año de nacimiento, género), para que no vuelva a discutirse sin motivo.

## Non-Goals

- **Nombre y apellido separados**: se sigue usando «Nombre visible», un campo libre. Dividir nombres falla con nombres únicos, dos apellidos u otro orden, y no hay facturación que lo requiera.
- **Año o fecha de nacimiento y género**: no se piden. Es información sensible con casi ningún uso aquí; los pronombres ya resuelven cómo referirse a la persona. La edad mínima se fija en los Términos (queda anotada como pendiente en `/privacy`); no se verifica ni se pregunta la edad.
- **Aplicar los pronombres a los textos de la interfaz**: la copia que habla de una persona ya es neutra ("su", "their") y varía en muy pocos lugares; usar los pronombres ahí los filtraría a quien no tiene acceso al perfil. En esta fase son una etiqueta del perfil.
- **Banderas emoji**: Windows no las dibuja; se muestra el nombre del país.
- **Descubrir gente por país**, estadísticas por país o visibilidad por campo (público / seguidores / solo yo): la regla es la del perfil.
- **Cambiar la visibilidad de la bio**: sigue siendo pública en un perfil privado.
- **Foto de perfil**: sigue reservada a la spec de imágenes.

## What Changes

- **País** (`app_user.country`, código de 2 letras): lista cerrada de países con nombres localizados (es/en) generados por el navegador y el servidor, con un selector con buscador como el de la zona horaria.
- **Ciudad o región**: la columna `location` no cambia; la etiqueta pasa de «Ubicación» a «Ciudad o región». No se migra ni se pierde ningún dato.
- **Pronombres**: `app_user.pronoun_set` guarda `he`, `she` o `they` (se muestran «él», «ella», «elle» en español y «he/him», «she/her», «they/them» en inglés, según el idioma de quien mira). «Otro» sigue usando `pronouns` (texto libre, hasta 40). Los pronombres libres que ya existen se conservan como «Otro».
- **Editor**: el selector de pronombres con su ejemplo en vivo, el selector de país y el campo de ciudad, en la pantalla Perfil de Ajustes y en el modo edición (el mismo editor de identidad).
- **Placa**: los pronombres como chip junto al nombre y «Ciudad, País» en la línea de datos, sin hueco cuando faltan.
- **BREAKING (comportamiento)**: en un perfil **privado**, un visitante sin acceso deja de ver los pronombres y la ubicación (hoy sí los ve). Ver la bio, los enlaces y los contadores no cambia. El dueño y quien lo sigue con relación aceptada siguen viéndolo todo.
- **Registro sin cambios**: sigue pidiendo solo usuario, email y contraseña.
- **Política `/privacy`**: nueva sección con los datos personales opcionales (qué son, para qué, quién los ve, cómo borrarlos) y la edad mínima como punto por definir.

## Capabilities

### New Capabilities

- `profile-personal-info`: país, ciudad o región y pronombres del perfil (listas cerradas, «Otro», ejemplo en vivo), su visibilidad según el acceso al perfil, su inclusión en la exportación y el borrado, y la lista de datos que no se piden.

### Modified Capabilities

- `profile-identity`: los pronombres pasan de texto libre a una lista cerrada con «Otro», y la ubicación pasa a ser «ciudad o región»; ambos campos se rigen por `profile-personal-info`.
- `social-profiles`: la identidad extendida que un perfil privado muestra siempre ya no incluye los pronombres ni la ubicación.
- `owner-settings`: la pantalla Perfil incorpora el selector de país y el de pronombres con su ejemplo.

## Impact

- **Base de datos** (una migración, verificar el siguiente número libre, hoy `0042`): `app_user.country` (`TEXT`, `CHECK` de formato de dos letras mayúsculas) y `app_user.pronoun_set` (`TEXT`, sin `CHECK` de valores: la lista cerrada vive en el código, igual que los géneros), con un `CHECK` que impide tener a la vez `pronoun_set` y `pronouns`. Sin backfill.
- **Código**:
  - `src/lib/personal-info.ts` (nuevo, puro): lista de países y de pronombres, y la validación de ambas.
  - `src/lib/api/schemas.ts` (`country`, `pronounSet` en el PATCH del perfil y en la identidad extendida).
  - `src/services/profiles/identity.ts` (guardar y validar), `profile-view.ts` (vaciar para quien no tiene acceso) y `data-export.ts`.
  - Componentes: `OwnerIdentityEditor`, un selector con buscador genérico extraído de `TimezonePicker`, `ProfileIdentity` y la Placa.
- **API**: `PATCH /api/me/profile` gana `country` y `pronounSet`; ambos opcionales y con `VALIDATION_ERROR` ante valores fuera de la lista. Sin códigos de error nuevos.
- **Mensajes** `messages/{es,en}/users.json` y `legal.json`; docs (`docs/05-features/user-profile.md`, `docs/04-api/contracts.md`, `docs/03-data/sql-model.md`).
- **Sin dependencias nuevas**: los nombres de países salen de `Intl.DisplayNames`.
- **Pruebas**: unitarias por servicio y componente, y una sección nueva en el smoke contra Postgres real (`scripts/smoke-test-account-settings.ts` o uno propio) que compruebe el `CHECK`, el vaciado para un perfil privado y la exportación.
