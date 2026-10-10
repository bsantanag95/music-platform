## MODIFIED Requirements

### Requirement: Resumen al terminar el onboarding

Al cerrar el onboarding con éxito, el sistema SHALL mostrar un resumen de lo hecho en el flujo (favoritos guardados, artistas seguidos, escuchas registradas, elementos en Pendientes; solo los conteos mayores que cero) y los siguientes pasos, en lugar de redirigir de inmediato a Inicio. El resumen SHALL tener una **única acción principal**, «Ir a Inicio», y SHALL presentar el resto de las salidas como enlaces secundarios en una lista «También puedes»: primero, solo entre las cosas que la persona aún no hizo, elegir sus géneros en el perfil y valorar un disco; después explorar cuando esté activo y buscar gente. El botón de salida SHALL decir «Saltar por ahora» si el usuario no hizo nada y «Terminar ahora» si ya hay algo, y en ambos casos SHALL guardar los álbumes elegidos.

#### Scenario: Resumen con lo hecho

- **WHEN** el usuario eligió 3 álbumes, siguió a 2 artistas, registró 1 escucha y guardó 2 elementos en Pendientes, y termina
- **THEN** ve «Todo listo» con 3 favoritos, 2 artistas seguidos, 1 escucha y 2 en Pendientes, y los siguientes pasos

#### Scenario: Terminar sin haber hecho nada

- **WHEN** el usuario salta el onboarding sin elegir, seguir, registrar ni guardar nada
- **THEN** el onboarding queda cerrado y el resumen no menciona conteos

#### Scenario: Terminar antes del último paso

- **WHEN** el usuario eligió dos álbumes en el paso 1 y toca «Terminar ahora» en el paso 2
- **THEN** los dos álbumes se guardan como favoritos y el onboarding queda cerrado

#### Scenario: Sugerencias de lo que falta

- **WHEN** el usuario terminó sin registrar ninguna escucha
- **THEN** el resumen sugiere valorar un disco, y si sí registró una escucha no lo sugiere

#### Scenario: Una sola acción principal

- **WHEN** se muestra el resumen
- **THEN** «Ir a Inicio» es el único botón y las demás salidas son enlaces dentro de la lista «También puedes», con las sugerencias personales antes que Explorar y Buscar gente
