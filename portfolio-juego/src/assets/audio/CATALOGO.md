# Catálogo de audio

Todos los archivos de esta carpeta son **síntesis procedural original**, generada con el motor
propio en `.claude/skills/game-audio-design/scripts/dsp.js` (osciladores, ruido filtrado, biquad
RBJ, saturación, reverb tipo Schroeder, envolventes, empalme de bucle). No contienen muestras de
terceros ni material con copyright — no se necesita atribución.

Para regenerar o pedir variantes: ver `.claude/skills/game-audio-design/SKILL.md`. El script que
produjo esta versión exacta es `generate-catalog.js`.

| Archivo | Evento en el código | Descripción |
|---|---|---|
| `teletransporte_desaparecer.wav` | `Jugador.desaparecer()` (`src/entities/Jugador.js`) | Carga arcana (arpegio de campanas) + combustión infernal: gruñido grave saturado, remolino mágico continuo, rugido ascendente, llama en diente de sierra, chispas. |
| `teletransporte_aparecer.wav` | `Jugador.aparecer()` (`src/entities/Jugador.js`) | Remolino mágico ascendente + impacto controlado + cola de brasas + asentamiento de 3 notas de campana. |
| `ambiente_principal_loop.wav` | Música de fondo (todas las escenas, v1) | Drone oscuro en D2/A2 con filtro modulado, sub-grave, pulso tipo mecanismo cada 2.4s, motivo disperso en escala frígia con eco, textura alta paneando. Bucle de 24s, empalme exacto (sin clics). |
| `carpeta_abrir.wav` | `sonidos.reproducir("carpetaAbrir")` → abrir `panel-proyecto-uno` | Flip de página + aleteo de papel + chispa mágica de confirmación. |
| `carpeta_cerrar.wav` | `sonidos.reproducir("carpetaCerrar")` → cerrar `panel-proyecto-uno` | Versión corta e inversa del flip, sin chispa mágica. |
| `espejo_abrir.wav` | `sonidos.reproducir("espejoAbrir")` → abrir `panel-ordenador` (el objeto usa el sprite del espejo arcano) | Tink de cristal con cola larga, armónicos sostenidos con vibrato, swell grave ascendente. Mucha reverb (el espejo "despierta"). |
| `espejo_cerrar.wav` | `sonidos.reproducir("espejoCerrar")` → cerrar `panel-ordenador` | Versión corta del tink + armónicos descendentes. |
| `portal_abrir.wav` | `sonidos.reproducir("portalAbrir")` → abrir `panel-cambio-nivel` | Zumbido de mecanismo arcano ascendente + resonancia metálica de engranaje antiguo. Es la confirmación del portal, no el teletransporte en sí (ese usa los sonidos de arriba). |
| `portal_cerrar.wav` | `sonidos.reproducir("portalCerrar")` → cerrar/cancelar `panel-cambio-nivel` | Versión corta y descendente. |
| `contacto_enfoque.wav` | `sonidos.reproducir("contactoEnfoque")` → foco en el formulario de email | Blip electromecánico corto con reducción de muestreo (retroinformática/lo-fi). |
| `contacto_enlace.wav` | `sonidos.reproducir("contactoEnlace")` → abrir GitHub/LinkedIn/CV | Doble blip ascendente, mismo carácter lo-fi que el anterior pero distinguible. |
| `salto.wav` | `Jugador.saltar()` | Whoosh de aire filtrado + pequeño puff ascendente. Sustituye al `phaseJump1` genérico anterior. |
| `paso1.wav` / `paso2.wav` | `Jugador` ciclo "caminar" (una vez por vuelta de 3 fotogramas, ~cada 390ms) | Pisada sobre rejilla metálica/piedra: ruido filtrado corto + tic metálico discreto. Dos variantes alternadas (`sonidos.reproducirPaso()`) para que no suene repetitivo. Muy bajas en volumen porque se repiten constantemente. |

## Reemplazado en esta ronda

Se retiró el pack CC0 de Kenney (`phaseJump1`, `highUp`, `highDown`, `pepSound1`, `pepSound2`) por
no encajar con la dirección artística (sonidos genéricos de interfaz). `tools/preparar-audio.cjs`
(el script que convertía esos OGG a WAV) ya no se usa — se puede eliminar si no se necesita para
otra cosa.
