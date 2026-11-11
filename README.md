# Portfolio interactivo 2D

Un portfolio web con estética pixel art que presenta información personal, habilidades, formación, experiencia y proyectos mediante un personaje jugable, escenarios y objetos interactivos.

La navegación combina movimiento por niveles con paneles de información y una pantalla de contacto. El entorno incorpora portales, fondos animados y efectos de sonido.

## Características

### Un portfolio para explorar

- **Personaje jugable** con movimiento lateral, salto y animaciones.
- **Sistema de niveles reutilizable** con portales para desplazarse entre escenarios.
- **Colisiones y escaleras** que forman parte del recorrido.
- **Objetos interactivos** mediante proximidad y clic.

### Contenido del portfolio

- **Sobre mí** con habilidades y formación.
- **Experiencia** en un bloque con desplazamiento.
- **Proyectos** presentados en un panel propio.
- **Contacto** con formulario y enlaces.

### Ambientación e interfaz

- **Fondos animados en cuatro niveles**, con lava, agua, lámparas, brillos, señales y objetos colgantes.
- **Animaciones de fondo mediante CSS** que respetan la preferencia `prefers-reduced-motion`.
- **Control de sonido** desde el icono de altavoz de la cabecera, con persistencia local de la preferencia.
- **Interfaz en español e inglés**, con español como idioma predeterminado. La selección se conserva mediante `localStorage` y el cambio recarga la página para actualizar los textos.
- **Botones táctiles en móvil y tablet** para movimiento, salto e interacciones contextuales.

## Controles

### Teclado

| Tecla | Acción |
| --- | --- |
| ← / → | Mover al personaje |
| Espacio | Saltar |
| ↑ | Subir por escaleras cuando corresponde |
| I | Interactuar con información, proyectos o portales |
| E | Interactuar con objetos de contacto |
| Escape | Cerrar paneles |

### Interfaz y controles táctiles

- El icono de altavoz activa o silencia el sonido.
- El selector de idioma de la cabecera permite cambiar entre español e inglés.
- Los botones táctiles ofrecen movimiento, salto y acciones contextuales.
- Los objetos interactivos también admiten clic.

### Atajos de desarrollo

| Tecla | Acción |
| --- | --- |
| O | Mostrar u ocultar los bordes de colisión |
| Q / W | Aparición y desaparición temporal del personaje durante el desarrollo |

## Tecnologías

El proyecto está desarrollado con **HTML, CSS y JavaScript vanilla**, organizado mediante módulos ES. La internacionalización utiliza **i18next** y archivos JSON locales.

El código separa las entidades del juego, los controles, las animaciones, el sonido, la interfaz y los textos traducidos.

## Estructura del proyecto

```text
portfolio-juego/
├── index.html
├── src/
│   ├── assets/
│   │   ├── audio/
│   │   ├── documentos/
│   │   ├── fuentes/
│   │   ├── iconos/
│   │   ├── imagenes/
│   │   └── sonidos/
│   ├── css/
│   ├── entities/
│   │   ├── Entidad.js
│   │   ├── Jugador.js
│   │   ├── Nivel.js
│   │   ├── ObjetoInteractivo.js
│   │   └── PlataformaColision.js
│   ├── js/
│   │   ├── animaciones.js
│   │   ├── configuracion.js
│   │   ├── controles.js
│   │   ├── fondos-animados-datos.js
│   │   ├── fondos-animados.js
│   │   ├── i18n.js
│   │   ├── juego.js
│   │   ├── principal.js
│   │   └── sonidos.js
│   └── lang/
│       ├── es.json
│       └── en.json
├── experimentos/
│   └── lava-animada/
├── tests/
│   ├── audio.cjs
│   └── fondos-animados.cjs
└── tools/
    ├── generar-fondos-animados.cjs
    └── preparar-audio.cjs
```

- **`src/assets/`** reúne imágenes de escenarios, personaje, objetos e interfaz, además de audio, iconos y documentos.
- **`src/css/`** organiza los estilos del escenario, el personaje, la interfaz, los objetos interactivos y los fondos animados.
- **`src/entities/`** contiene las entidades del juego, incluidos el jugador, los niveles, los objetos interactivos y las plataformas de colisión.
- **`src/js/`** agrupa la lógica del juego y los módulos de controles, animación, sonido e idioma.
- **`src/lang/`** contiene los textos en español e inglés.
- **`experimentos/lava-animada/`** reúne una comparación visual, fotogramas y scripts relacionados con los recursos animados.
- **`tests/`** contiene archivos de pruebas de audio y fondos animados.
- **`tools/`** contiene herramientas para generar fondos animados y preparar audio.
