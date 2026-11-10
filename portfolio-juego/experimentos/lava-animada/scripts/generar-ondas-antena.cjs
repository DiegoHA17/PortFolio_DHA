"use strict";
// Genera las ondas de señal de las antenas de escenario4 en Node puro (sin navegador).
const path = require("node:path");
const { escribirPNG } = require("./png-escribir.cjs");
const { leerPNG } = require("./png-leer.cjs");

const RUTA_ESCENARIO = path.resolve(__dirname, "../../../src/assets/imagenes/escenarios/escenario4.png");
const CARPETA_SALIDA = path.resolve(__dirname, "../recursos/frames");

const ANCHO = 1672, ALTO = 941;
const N = 8;
// nodos inferiores de las antenas, coordenadas confirmadas por el usuario
const PUNTOS = [
    { cx: 206, cy: 216, faseOffset: 0 },
    { cx: 595, cy: 215, faseOffset: 0.5 }
];
const RADIO_MAX = 22; // ondas pequeñas y discretas
const GROSOR = 2.6;

function dibujarAnillo(buf, w, h, bx, by, radio, grosor, alfa, color) {
    const r0 = Math.max(0, radio - grosor), r1 = radio + grosor;
    for (let dy = -Math.ceil(r1); dy <= Math.ceil(r1); dy++) {
        for (let dx = -Math.ceil(r1); dx <= Math.ceil(r1); dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < r0 || d > r1) continue;
            const x = bx + dx, y = by + dy;
            if (x < 0 || x >= w || y < 0 || y >= h) continue;
            const i = (y * w + x) * 4;
            const alfaFinal = Math.round(alfa * 255);
            if (alfaFinal <= buf[i + 3]) continue;
            buf[i] = color[0]; buf[i + 1] = color[1]; buf[i + 2] = color[2]; buf[i + 3] = alfaFinal;
        }
    }
}

function main() {
    // color coherente con la escena: morado arcano, igual que el resto de luces de escenario4
    const color = [205, 140, 255];
    for (let f = 0; f < N; f++) {
        const buf = new Uint8Array(ANCHO * ALTO * 4); // todo transparente
        for (const p of PUNTOS) {
            // dos ondas por antena desfasadas para que la señal se sienta continua, pero pequeñas
            for (let k = 0; k < 2; k++) {
                const faseCruda = (f / N + p.faseOffset + k * 0.5) % 1;
                const radio = 3 + faseCruda * RADIO_MAX;
                const alfa = (1 - faseCruda) * 0.95;
                if (alfa > 0.02) dibujarAnillo(buf, ANCHO, ALTO, p.cx, p.cy, radio, GROSOR, alfa, color);
            }
        }
        const ruta = path.join(CARPETA_SALIDA, `ondas4-${f}.png`);
        const bytes = escribirPNG(ruta, ANCHO, ALTO, buf);
        console.log(`ondas4-${f}.png: ${bytes} bytes`);
    }
}

main();
