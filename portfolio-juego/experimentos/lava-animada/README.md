# Experimento: lava animada (prueba aislada, no integrada)

Prueba de concepto para animar la cascada de lava del fondo de la escena "Inicio"
(`escenario1.png`). **Nada de esto toca el juego real** — vive aparte en esta carpeta.

El `.git` del proyecto está vacío (no es un repositorio funcional), así que no se pudo crear
una rama de verdad; el aislamiento es por carpeta.

## Cómo verlo

Con el servidor local ya corriendo en `127.0.0.1:5500` (el mismo que sirve el juego):

```
http://127.0.0.1:5500/experimentos/lava-animada/comparacion.html
```

Botón "Activar animación" alterna entre el escenario original y el animado sin recargar.
"Simular cámara" prueba que la capa sigue el scroll igual que el fondo real.

## Técnica

1. **Localización**: en vez de recortar a ojo, un script en el navegador (canvas +
   `getImageData`) escaneó `escenario1.png` buscando píxeles cálidos (rojo/naranja,
   saturación alta) y encontró dos cascadas por columnas de alta densidad. Se eligió la más
   prominente: recorte en x555–645, y50–335 (90×285px de los 1672×941 totales).
2. **Máscara por color** (no un rectángulo): cada píxel del recorte se clasifica como
   lava o no: el resto queda transparente. Se añadió una pasada de dilatación (un píxel no
   clasificado con ≥3 vecinos de lava también se incluye) porque la clasificación por color
   sola dejaba huecos en los bordes antialiasados.
3. **Animación — ola de brillo, no desplazamiento de píxeles**: en vez de desplazar la
   textura (que exige resolver una costura de bucle), cada píxel de lava se reescala de
   brillo según una onda triangular cuya fase depende de su posición Y y del fotograma
   (3 ciclos de banda a lo largo del recorte, 8 fotogramas, ~160ms cada uno). El tono se
   mantiene, solo cambia el brillo dentro de un rango acotado (×0.85 a ×1.15) — sin
   interpolar entre colores, sin introducir tonos nuevos. Se perciben bandas de brillo
   bajando por el chorro.
4. **Composición sin tapar arquitectura**: cada fotograma se pinta sobre un lienzo
   transparente del tamaño completo de la imagen original (1672×941) en la misma posición
   del recorte, y se usa exactamente la misma regla CSS que el fondo real
   (`background: url(...) center top / cover`). Así la capa se escala y recorta de forma
   idéntica al fondo en cualquier tamaño de ventana, sin tener que replicar a mano las
   matemáticas de "cover". Como solo los píxeles de lava son opacos, no hace falta
   literalmente poner la capa "detrás" de las cadenas/plataformas — nunca se dibuja nada
   donde no había lava.

## Recursos generados

- `recursos/frames/cascada1-0.png` … `cascada1-7.png` — cascada principal (x555–645, y50–335).
- `recursos/frames/cascada2-0.png` … `cascada2-7.png` — segunda cascada (x1060–1140, y45–370).
- `recursos/frames/suelo-0.png` … `suelo-7.png` — lava del suelo (ancho completo, y770–910) con
  onda de brillo horizontal (5 ciclos) + 14 burbujas con ciclo de vida propio (crecen, estallan,
  desaparecen) en posiciones fijas (semilla determinista) dentro de la máscara de lava.
- Las 24 imágenes son fotogramas completos (1672×941, mayormente transparentes) — **3.3MB en
  total**, bastante más que la v1 de una sola cascada (440KB); ver nota de peso en la evaluación.
- `inspector.html` — herramienta usada para localizar la lava por color (reutilizable para
  otras zonas si se aprueba extender esto).
- `comparacion.html` — vista de prueba con el interruptor.
- `scripts/guardar-servidor.cjs` — servidor temporal (puerto 5501) usado solo para sacar los
  PNG generados en el navegador a disco. No se necesita para ver el resultado, solo se usó
  durante la generación.

## Ronda 4: señal viajando de los iconos de contacto a las antenas

El usuario corrigió a mano las imágenes de la jaula/cajón de la escena 2 (`jaula2-sprite-v2.png`,
`cajon2-sprite.png`, `fondo2-parcheado.png`) — no se tocaron en esta ronda.

Las "ondas" de la escena 4 no eran lo que quería: pidió **esferitas viajando desde cada icono de
contacto (email/GitHub/LinkedIn/CV) hasta su antena**, no anillos estáticos en el nodo. Localicé
los 4 iconos por detección de brillo sobre `escenario4.png` (no estaban donde sugería el hitbox
de `configuracion.js` — el brillo real está en la parte alta de esa caja, no en el centro):
email≈(155,684), github≈(309,684), linkedin≈(489,690), cv≈(667,684). Agrupación por cercanía
horizontal: email+github → antena izquierda (206,216), linkedin+cv → antena derecha (595,215).

`scripts/generar-senal-contacto.cjs` (reemplaza a `generar-ondas-antena.cjs` para este archivo)
genera 4 esferas con cola corta de 2 posiciones, recorriendo esa trayectoria en bucle de 8
fotogramas, con fase propia por partícula para que no salgan las 4 a la vez, y desvanecido al
salir del icono / llegar a la antena en vez de aparecer o desaparecer de golpe.

**Esta ronda se hizo entera en Node** (detección de iconos, generación de partículas,
comprobación de posiciones/límites por fotograma) — no se abrió el navegador, así que lo de
"las esferitas nacen del punto correcto" está verificado por coordenadas, no visto. Pendiente de
que el usuario lo confirme visualmente o pida una verificación en vivo.

## Ronda 3: correcciones de calidad, sin navegador salvo para la verificación final

Tras la ronda 2, el ordenador se quedó sin memoria (2.2GB libres de 13.86GB, con varias apps del
usuario ya consumiendo el resto) y mató mi servidor auxiliar; además el servidor del usuario en
el puerto 5500 dejó de responder. Para esta ronda:

- Se escribió un **decodificador y codificador PNG propio en Node** (`scripts/png-leer.cjs`,
  `scripts/png-escribir.cjs`, sin dependencias, probados con un round-trip byte a byte) para
  poder generar y analizar los sprites **sin necesitar Chrome en absoluto** la mayor parte del
  tiempo. Solo se abrió el navegador una vez, al final, para la verificación visual real.
- `scripts/extraer-colgantes.cjs` rehace la extracción de la jaula y el cajón: la mascara por
  sustracción de fondo ahora se cruza con su **componente conexa principal** (calculada sobre una
  versión dilatada para que la cadena fina no se desconecte del resto), eliminando el ruido
  disperso que antes dejaba "restos" visibles. También calcula el punto de anclaje real (donde
  empieza el contenido opaco) para usarlo como `transform-origin`, en vez de asumir el centro.
  El cajón se recortó más estrecho (75px→50px) tras detectar que incluía una tubería fija vecina
  que no debía moverse con él.
  - Jaula: punto de anclaje en 45% del ancho — casi el centro, como se esperaba.
  - Cajón: punto de anclaje en 30%/19% (no estaba centrado) — este era probablemente el motivo
    por el que antes "se veía mal": el pivote de rotación no coincidía con la cadena real.
- `scripts/generar-ondas-antena.cjs` genera las ondas de las antenas directamente por código
  (sin recortar nada de la imagen), centradas en los dos nodos inferiores que confirmaste:
  (206,216) y (595,215). Primera versión (grosor 1.6px, alfa 0.75) resultó invisible a la escala
  real del escenario — se detectó en la verificación visual, no se dio por buena a ciegas, y se
  corrigió a grosor 2.6px / alfa 0.95.
- Verificación final: un único servidor temporal ligero en el puerto **5502** (no 5500, que es
  tuyo), una única pestaña de Chrome, cerrada al terminar. Se confirmó: los 4 niveles cargan sin
  errores de consola, la jaula y el cajón oscilan con ángulos distintos en el mismo instante (no
  sincronizados), las casillas individuales desactivan cada capa por separado, y las ondas de las
  antenas nacen de los puntos correctos (comprobado proyectando las coordenadas reales a
  coordenadas de pantalla, no a ojo).

## Ronda 2: agua, luces y cadena por nivel (a petición del usuario)

Tras descartar "lo más brillante = animable" (ver sección siguiente), el usuario señaló a mano
qué animar en cada nivel. Resultado en `comparacion-todos.html` (selector de nivel + casillas
por capa):

- **Nivel 2**: agua de fondo (ventana/estanque, x0-1672 y845-925), 6 lámparas parpadeando
  (detectadas por componentes conexas, no a mano), y la jaula-farol colgante **oscilando de
  verdad** en su cadena — técnica distinta a todo lo anterior: se recortó el sprite completo
  (`jaula2-sprite.png`), se "parcheó" el hueco en una copia del fondo
  (`fondo2-parcheado.png`, clonando una franja vecina — no es inpainting real, es un parche
  simple) y el sprite se superpone con `transform: rotate()` animado por CSS (no por
  fotogramas). Es la parte más experimental y con más costuras visibles.
- **Nivel 3**: agua de fondo (y895-941) y 8 puntos de brillo (morados y cálidos) en faroles,
  piedras y velas, detectados por componentes conexas.
- **Nivel 4**: agua de fondo (y865-920) y ondas de señal expandiéndose sobre las dos antenas
  del terminal (efecto nuevo: arcos generados por código, no recoloreado de píxeles existentes).

**Peso total ahora: ~9.6MB** (24 fotogramas de la ronda 1 + ~56 más). Esto ya es demasiado para
integrarlo tal cual — ver evaluación crítica en el chat.

## Fondos de los niveles 2, 3 y 4 — sin candidato válido (ronda 1, descartado)

Se probó el mismo método (detección automática por brillo+saturación) en `escenario2.png`,
`escenario3.png` y `escenario4.png`. En los tres casos, lo más brillante/saturado del fondo
resultó ser un **objeto decorativo o de interfaz**, no un elemento ambiental de fondo:

- **Nivel 2 (Experiencia)**: el marco del panel de la pantalla de habilidades.
- **Nivel 3 (Proyectos)**: un estandarte/banner colgante.
- **Nivel 4 (Contacto)**: el marco del panel de contacto (con el icono de sobre dentro).

Se generaron animaciones para dos de ellos antes de darse cuenta del error (comprobando con un
muestreo de línea horizontal en busca del patrón de "marco", que no detectó el primero porque el
marco no era una línea recta ancha sino una esquina/contorno). Al verlo renderizado quedó claro
que era un panel de interfaz, no fondo — se descartaron esos fotogramas, no se dejaron en
`recursos/frames/`. No tiene sentido animarlos con el mismo "flujo" que la lava (un panel de UI
no fluye; un banner como mucho se balancearía, que es una animación distinta). No fuerzo una
animación donde no hay un elemento de fondo real que lo pida — el `comparacion-todos.html`
refleja esto explícitamente al seleccionar esos niveles.

## Evaluación crítica (ver mensaje de chat para la versión completa)

Funciona y no rompe nada, pero el efecto es sutil a la distancia normal de juego, el recorte
de la máscara no es perfectamente limpio en los bordes, y el peso (~440KB) no está
optimizado. Detalles en la respuesta.
