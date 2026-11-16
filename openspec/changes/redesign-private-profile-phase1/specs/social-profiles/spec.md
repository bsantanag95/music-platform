## ADDED Requirements

### Requirement: Vista del perfil privado sin acceso

Un perfil privado consultado por quien no tiene acceso SHALL presentarse con la misma cabecera del
perfil accesible (ver "Cabecera del perfil"): avatar, nombre visible como título principal, nombre de
usuario, antigüedad, bio como cita, enlaces, recuentos de seguidores y seguidos y la acción para
compartir, junto a una marca «Privado». Esa cabecera SHALL NOT incluir la Tarjeta de Identidad, el fondo
de carátula, los pronombres, el país ni la ciudad, ni la afinidad; los recuentos SHALL NOT enlazar a los
listados de conexiones. Debajo, en lugar del cuerpo del perfil, SHALL mostrarse una franja a todo el
ancho con un título, una sola oración y la acción que corresponde a quien mira, y las siluetas de las
secciones que se abren al seguir (Diario, Favoritos, Listas y Colección física): siempre las cuatro y
sin ningún dato, recuento ni carátula, para no revelar actividad de la cuenta. La palabra «privado» SHALL
aparecer una sola vez como marca, sin repetirse en rótulo y título.

Según quien mira:

- **Sin sesión**: invita a iniciar sesión para pedir seguir, con un acceso secundario para crear una
  cuenta.
- **Con sesión, sin relación**: ofrece pedir seguir y, cuando los hay, indica cuántos seguidores tienen
  en común (ver `profile-affinity`).
- **Solicitud enviada**: indica que la solicitud está pendiente, que se le avisará cuando la acepte y
  que el perfil se abrirá en esa misma página, y ofrece cancelarla.
- **Solicitud recibida de esa cuenta**: indica que esa cuenta pidió seguirle y permite responder.
- **Bloqueo hecho por quien mira**: indica el bloqueo y ofrece desbloquear, sin siluetas.
- **Bloqueo hecho por la cuenta**: solo el nombre visible y el usuario, sin bio, enlaces, recuentos,
  siluetas ni acciones.
- **Previsualización «cómo te ven» del dueño**: la vista de un visitante sin sesión, con la acción
  inerte y el aviso para volver.

#### Scenario: Visitante sin sesión

- **WHEN** un visitante sin sesión abre un perfil privado
- **THEN** ve la cabecera con la marca «Privado», la franja «Solo para seguidores» con la invitación a
  iniciar sesión y las siluetas de las cuatro secciones, sin datos ni recuentos

#### Scenario: Solicitud enviada

- **WHEN** quien pidió seguir abre el perfil privado
- **THEN** la franja indica que la solicitud está pendiente, que se le avisará y que el perfil se
  abrirá ahí, y ofrece cancelarla

#### Scenario: Recuentos sin listados

- **WHEN** un visitante sin acceso pulsa el recuento de seguidores de un perfil privado
- **THEN** no navega al listado de seguidores: el recuento es solo texto

#### Scenario: Bloqueado por la cuenta

- **WHEN** quien fue bloqueado por la cuenta abre su perfil privado
- **THEN** ve solo el nombre visible y el usuario, sin bio, enlaces, recuentos, siluetas ni acciones

#### Scenario: Siluetas sin actividad

- **WHEN** el dueño de un perfil privado no tiene diario, favoritos, listas ni colección
- **THEN** un visitante sin acceso ve igualmente las cuatro siluetas, idénticas a las de un perfil
  con contenido

#### Scenario: Teléfono

- **WHEN** un visitante sin acceso abre un perfil privado en una pantalla de 390 px
- **THEN** la cabecera, la franja y las siluetas se apilan sin desplazamiento horizontal
