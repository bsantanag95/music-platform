# catalog-view-states

Estados de carga, boundaries de error y not-found, tolerancia a fallos parciales, accesibilidad
básica y adaptación al viewport móvil de las vistas públicas del catálogo.

## Requirements

### Requirement: Estados de carga localizados por ruta
Las rutas públicas de búsqueda, artista y álbum SHALL mostrar un estado de carga localizado
mediante `loading.tsx` o un componente equivalente, sin dejar la página en blanco mientras se
resuelve la carga inicial.

#### Scenario: Carga inicial de artista
- **WHEN** una persona navega al perfil de un artista y los datos todavía no están disponibles
- **THEN** la ruta muestra un skeleton localizado con una estructura representativa del perfil

#### Scenario: Carga inicial de álbum
- **WHEN** una persona navega al detalle de un álbum y los datos todavía no están disponibles
- **THEN** la ruta muestra un skeleton localizado del encabezado y del tracklist

### Requirement: Boundaries localizados de error y not-found
La aplicación SHALL mostrar mensajes localizados y accionables en errores no recuperables y
recursos inexistentes, sin exponer mensajes crudos del backend ni trazas internas.

#### Scenario: Recurso inexistente
- **WHEN** una persona visita un artista o álbum que no existe
- **THEN** se muestra la pantalla not-found localizada con una acción para volver al catálogo o buscar

#### Scenario: Error inesperado
- **WHEN** una ruta pública encuentra una excepción no recuperable
- **THEN** se muestra el boundary de error localizado con una acción de reintento

### Requirement: Fallos parciales no rompen el catálogo
Un fallo al resolver o cargar una carátula SHALL afectar únicamente a la carátula correspondiente
y SHALL conservar usable el resto de la tarjeta, la grilla, el tracklist y la navegación.

#### Scenario: Carátula fallida en la discografía
- **WHEN** una carátula de la grilla no puede cargarse después de sus reintentos
- **THEN** la tarjeta muestra un placeholder accesible y mantiene su enlace al álbum

#### Scenario: Carátula fallida en el álbum
- **WHEN** la carátula del detalle no puede cargarse
- **THEN** el placeholder reemplaza la imagen y el tracklist permanece visible

### Requirement: Accesibilidad básica del catálogo
Las vistas públicas SHALL proporcionar nombres accesibles para controles, imágenes y estados,
mantener el foco navegable y no depender únicamente del color para comunicar errores o estados.

#### Scenario: Campo de búsqueda
- **WHEN** una persona navega el formulario de búsqueda con tecnologías asistivas
- **THEN** el campo tiene un label asociado y los errores se anuncian mediante su relación ARIA

#### Scenario: Estado de carga
- **WHEN** se muestra un skeleton de contenido o carátula
- **THEN** el estado expone un rol y etiqueta accesibles sin anunciar texto musical como texto de UI

### Requirement: Layout usable en viewport móvil
Las páginas públicas SHALL adaptarse desde viewport móvil sin overflow horizontal, texto cortado
ni controles inaccesibles, y SHALL conservar la navegación y el contenido musical en viewport de
escritorio.

#### Scenario: Perfil en móvil
- **WHEN** una persona visita el perfil de artista en un viewport móvil
- **THEN** el encabezado, breadcrumbs y grilla se ajustan al ancho disponible sin scroll horizontal

#### Scenario: Álbum en móvil
- **WHEN** una persona visita un álbum multidisco en un viewport móvil
- **THEN** el tracklist y los créditos permanecen legibles y navegables sin cortar contenido
