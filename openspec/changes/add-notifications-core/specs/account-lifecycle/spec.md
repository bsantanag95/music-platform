## MODIFIED Requirements

### Requirement: Exportar los datos propios

El sistema SHALL permitir a un usuario autenticado descargar un archivo JSON con sus datos:
perfil y preferencias (incluidas las de notificación), enlaces, destacados y preguntas, diario (incluidas las notas privadas),
valoraciones, reseñas, comentarios, favoritos, por escuchar, listas con sus ítems, colección y
deseos, artistas seguidos, y los usuarios de sus seguidores, seguidos y bloqueados. La respuesta
SHALL ser inmediata (`Content-Disposition: attachment`) y SHALL NOT incluir hashes de contraseña,
tokens, sesiones, notificaciones recibidas ni datos privados de otras personas. El sistema SHALL limitar la frecuencia a una
exportación por minuto por usuario (`RATE_LIMITED`).

#### Scenario: Descargar la exportación

- **WHEN** la persona pide exportar sus datos
- **THEN** recibe un archivo JSON con sus datos propios, incluidas las notas privadas del diario

#### Scenario: Sin secretos ni datos ajenos

- **WHEN** se inspecciona el archivo exportado
- **THEN** no contiene hash de contraseña, tokens, sesiones ni contenido privado de otras personas

#### Scenario: Frecuencia limitada

- **WHEN** la persona pide otra exportación pocos segundos después
- **THEN** la API responde `RATE_LIMITED` y no genera el archivo

#### Scenario: Preferencias de notificación sin la bandeja

- **WHEN** la persona desactivó "Nuevos seguidores" y exporta sus datos
- **THEN** el archivo incluye esa preferencia y no incluye las notificaciones recibidas
