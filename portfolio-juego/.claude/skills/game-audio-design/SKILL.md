---
name: game-audio-design
description: Use when designing, generating, or adjusting sound effects or music for this portfolio-game — composing original SFX/ambient loops via procedural synthesis (no external samples), creating variants of an existing sound, or wiring a new interactive object to a distinct sound. Triggers on requests like "crea un sonido arcano para X", "genera variantes de Y", "haz que esto suene más metálico/menos electrónico", or anything about this project's audio catalog.
---

# Diseño de sonido del portfolio-game

Motor de síntesis procedural propio (Node puro, sin dependencias ni muestras externas) para la
identidad sonora del portfolio: fantasía oscura, arcana, industrial. Genera WAV reales y
reproducibles a partir de código — no es solo documentación de cómo hacer audio.

No hay Python/NumPy disponible en este entorno; por eso el motor está en JavaScript (Node),
usando las mismas ideas de síntesis (osciladores, ruido filtrado, filtros biquad, envolventes,
reverb) que se usarían con `scipy`/`numpy`. Si en el futuro hay Python disponible, el enfoque es
portable, pero no hace falta reescribirlo para seguir usando este skill.

## Dirección artística (no te la saltes)

- Fantasía oscura + arcano + industrial. Nada de terror genérico, nada de pitidos de interfaz.
- La magia **fluye**, no solo golpea: usa `remolinoMagico` + `armonicosMagicos` (ver abajo) para
  que la energía sea continua, en vez de un único transitorio seco.
- Los objetos "físicos" (papel, cristal, metal) deben sonar a su material, no a "beep genérico".
  Evita que un golpe de ruido con Q alto y ataque rápido == "disparo"; para texturas suaves usa
  ataques de 20-50ms y escalona las capas en el tiempo en vez de que ataquen todas a la vez.
- Paleta por familia de objeto (ya establecida en el catálogo, amplíala con el mismo criterio):
  - **Teletransporte del jugador**: combustión/gruñido infernal + remolino mágico + campanas.
  - **Espejo arcano**: cristal, ecos largos (reverb grande), armónicos con vibrato lento.
  - **Portal de nivel**: mecanismo/engranaje antiguo, zumbido grave, menos "fuego" que el jugador.
  - **Carpeta/papel**: flip + aleteo de papel, ataques lentos, chispa mágica solo al final.
  - **Contacto/terminal**: blips electromecánicos con reducción de muestreo (lo-fi/retro).
- Antes de dar por bueno un sonido nuevo, compáralo con el catálogo existente
  (`src/assets/audio/CATALOGO.md`): si dos sonidos de familias distintas usan la misma capa sin
  variar timbre/duración/comportamiento, no está bien diferenciado.

## Flujo de trabajo

1. **Define el evento real**: mira `portfolio-juego/src/js/configuracion.js` (objetos
   interactivos, `panelId`) y `portfolio-juego/src/js/juego.js`/`Jugador.js` (dónde se llama a
   `sonidos.reproducir(...)`). No inventes objetos que no existen en el juego — el código es la
   fuente de verdad, no la idea original de la conversación.
2. **Escribe o edita un generador** en `scripts/generate-catalog.js` (o un script nuevo para
   experimentar) usando las utilidades de `scripts/dsp.js`. Reutiliza capas existentes cuando
   tenga sentido (ver "Vocabulario sonoro común" abajo) en vez de reinventar cada vez.
3. **Genera**: `node scripts/generate-catalog.js <carpeta-salida>` (por defecto
   `library/catalogo/`). Para una prueba rápida de una sola variante, escribe un script temporal
   que importe `dsp.js`/`wav.js` igual que `generate-catalog.js`.
4. **Comprueba técnicamente**: `node scripts/analyze.js <carpeta>` — pico, RMS, salto de costura
   en bucles. Esto NO sustituye escuchar el sonido; es solo para detectar clipping, silencio o
   bucles con clic antes de perder tiempo revisándolo de oído.
5. **Previsualiza de oído**: publica (o reutiliza) una página con `<audio>` para cada archivo —
   ver el patrón en las conversaciones previas de este proyecto (una página simple con un
   `<audio controls src="archivo.wav">` por sonido y una nota de qué evento dispara cada uno).
   Nunca des un sonido por definitivo sin que un humano lo escuche.
6. **Copia a producción**: `cp library/catalogo/*.wav ../../../src/assets/audio/` (desde
   `scripts/`) y actualiza `src/assets/audio/CATALOGO.md` con el archivo, el evento de código y
   una descripción corta.
7. **Conecta el evento**: añade la entrada en `EFECTOS` (o `MUSICA`) en
   `src/js/sonidos.js` y llama a `sonidos.reproducir("nombre")` (o
   `sonidos.reproducirSonidoPanel(idPanel, "abrir"|"cerrar")` si es un panel) desde el sitio del
   código donde ocurre la acción.

## Vocabulario sonoro común (`scripts/dsp.js`)

Motor estéreo en Float64, 44.1kHz por defecto. Todo determinista (PRNG con semilla) para que un
sonido se pueda regenerar idéntico o con una semilla distinta para variantes.

- `oscilador({tipo, frecuenciaHz, segundos})` — seno/sierra/triángulo/cuadrada;
  `frecuenciaHz` puede ser una función `t => Hz` (glissandos, vibrato).
- `ruidoBlanco(segundos, sr, semilla)` + `biquad(buf, sr, {tipo, freq, q, gananciaDB})` —
  pasabajos/pasaaltos/pasabanda/pico (RBJ); `freq` puede ser función de `t` (barridos, remolinos).
- `envolvente(puntos, segundos, sr)` — envolvente por puntos de ruptura `[[t,valor],...]`.
- `saturarSuave(buf, drive)` — distorsión tipo tanh (grit infernal/industrial).
- `retardo(...)`, `reverb(...)` — eco con filtro en la realimentación; reverb Schroeder (4 combs +
  2 allpass).
- `remolinoMagico({duracion, freqInicio, freqFin, lfoHz, lfoProfundidad, semilla})` — ruido
  resonante cuyo centro serpentea con un LFO: la "energía mágica continua" de la dirección
  artística, en vez de un barrido lineal de una sola vez.
- `armonicosMagicos({duracion, freqBase, freqFinal, vibratoHz})` — fundamental + 2 armónicos con
  vibrato, sostenidos — shimmer mágico que dura todo el sonido.
- `haceBucle(buf, segundosBucle, cruceSeg)` + `corregirCosturaBucle(buf, ms)` — para música:
  renderiza `segundosBucle + cruceSeg` de contenido continuo, cruza la cola sobre la cabeza, y
  corrige el salto de muestra residual para que el bucle sea exacto. Comprueba siempre
  `saltoCostura` con `analyze.js` tras tocar esto.
- `submuestrear(buf, factor)` — baja la frecuencia de muestreo (con anti-aliasing) para aligerar
  pistas largas; úsalo en música, no en SFX corto (no merece la pena).
- `normalizarPico(buf, objetivoDB)` + `limitarSuave(buf, techoDB)` — deja siempre picos entre
  -1 y -4dBFS según el tipo de sonido (SFX más alto, música con más margen).

## Pedir variantes o ajustes

- "Genera 3 variantes de X": cambia la semilla del ruido y/o desplaza ligeramente frecuencias
  base en cada llamada; no hace falta una función nueva por variante, un bucle con 2-3 semillas
  basta.
- "Más metálico / menos electrónico": sube `q` en un `biquad` tipo `pico` sobre una capa de ruido
  (resonancia estrecha = metálico) y reduce el uso de ondas puras (seno/cuadrada) a favor de ruido
  filtrado y saturación.
- "Más corto/más largo": ajusta `duracion` y los puntos de la envolvente — mantén la forma relativa
  (ataque rápido, media vida con decaimiento, cola) en vez de solo recortar el final, o sonará
  cortado en vez de corto.
- Ajustes puntuales de volumen relativo se hacen en `EFECTOS`/`MUSICA` dentro de `sonidos.js`
  (campo `volumen`), no regenerando el audio.

## Limitaciones conocidas

- No hay forma de "escuchar" el resultado en este entorno: todo ajuste de timbre se hace por
  inspección técnica (pico/RMS/espectro aproximado vía la forma del filtro) y confirmación humana
  en la previsualización. Nunca afirmes que un sonido "queda bien" sin esa confirmación.
- No hay codificador MP3/OGG disponible (no hay ffmpeg ni Python); los archivos se exportan en
  WAV PCM 16 bits. Para música, usa `submuestrear` para aligerar el peso en vez de buscar un
  códec con pérdida.
