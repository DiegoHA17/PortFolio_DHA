# Portfolio interactivo 2D

Portfolio web gamificado con estetica pixel art, personaje jugable, niveles, objetos interactivos, paneles de informacion, formulario de contacto e internacionalizacion.

El proyecto esta hecho con HTML, CSS y JavaScript vanilla. No usa framework, bundler ni backend.

## Ejecutar en local

Desde la carpeta del proyecto:

```bash
cd portfolio-juego
python -m http.server 5500 --bind 127.0.0.1
```

Despues abre:

```text
http://127.0.0.1:5500/
```

No es recomendable abrir `index.html` con doble clic porque los modulos ES pueden fallar con `file://`.

## Controles

El icono de altavoz en la cabecera activa o silencia los efectos arcade y guarda
la preferencia localmente. No hay musica automatica: el audio se desbloquea con
la primera interaccion. Los cinco efectos son locales, de Kenney (CC0); fuentes
y licencia en `portfolio-juego/src/assets/audio/CREDITOS.md`. El volumen de cada
accion se puede ajustar en `portfolio-juego/src/js/sonidos.js`.

- Flechas izquierda/derecha: moverse.
- Space: saltar.
- Flecha arriba: subir por escaleras cuando corresponde.
- I: interactuar con objetos de informacion, proyectos o portales.
- E: interactuar con objetos de contacto.
- Escape: cerrar paneles.
- O: mostrar/ocultar bordes de colision para debug.
- Q/W: aparecer/desaparecer temporalmente durante desarrollo.

En movil y tablet hay botones tactiles para movimiento, salto e interacciones contextuales.

## Caracteristicas

- Sistema de niveles reutilizable.
- Portal entre niveles.
- Colisiones y escaleras.
- Objetos interactivos por proximidad y click.
- Panel "Sobre mi" con skills y formacion.
- Bloque de experiencia scrollable.
- Panel de proyectos.
- Pantalla de contacto con formulario y enlaces.
- Internacionalizacion con i18next y archivos JSON locales.
- Persistencia de idioma con `localStorage`.
- Fondos animados en los 4 niveles (lava, agua, lamparas, brillos, senales y objetos colgantes),
  solo con CSS y respetando `prefers-reduced-motion`. Los recursos se generan desde
  `portfolio-juego/experimentos/lava-animada` con `node tools/generar-fondos-animados.cjs`.

## Pruebas

Con el servidor local en marcha (requieren Playwright):

```bash
cd portfolio-juego
node tests/audio.cjs
node tests/fondos-animados.cjs
```

## Idiomas

Los textos estan en:

```text
portfolio-juego/src/lang/es.json
portfolio-juego/src/lang/en.json
```

El idioma por defecto es espanol. Al cambiar idioma desde la cabecera, se guarda la seleccion y se recarga la pagina para reiniciar el portfolio con todos los textos actualizados.

## Estructura

```text
portfolio-juego/
├── index.html
└── src/
    ├── assets/
    ├── css/
    ├── entities/
    ├── js/
    └── lang/
```

## Preparado para Git

El repositorio ignora archivos internos de Codex, dependencias, builds, logs y temporales mediante `.gitignore`.

Para subirlo a GitHub:

```bash
git add .
git commit -m "Initial interactive portfolio"
git branch -M main
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```
